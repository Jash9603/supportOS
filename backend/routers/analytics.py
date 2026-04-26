# -----------------------------------------------------------------------------
# routers/analytics.py — Analytics & Dashboard APIs
# -----------------------------------------------------------------------------
#
# TWO ENDPOINTS:
#   GET /analytics/overview  — Quick KPIs for the Overview dashboard (Phase 4)
#   GET /analytics/deep      — Full deep-dive for the Analytics page (Phase 4.5)
#
# The /deep endpoint accepts ?days=7 (or 30, 90) to filter by date range.
# It returns all 6 analytic datasets in a single response.
# -----------------------------------------------------------------------------

from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, and_, extract

from core.database import get_db
from dependencies import get_current_user
from models.user import User
from models.ticket import Ticket
from models.message import Message
from schemas.analytics import (
    AnalyticsOverview, AnalyticsSummary, DailyTicketCount, RecentTicket,
    AnalyticsDeep, SatisfactionPoint, TopQuestion, ResolutionBreakdown,
    PeakHoursData, EscalationPoint, ResponseTimePoint,
)

router = APIRouter()


# ══════════════════════════════════════════════════════════════════════════════
# ENDPOINT 1: Overview Dashboard (quick KPIs)
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/overview", response_model=AnalyticsOverview)
async def get_overview(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org_id = current_user.org_id
    now = datetime.now(timezone.utc)
    seven_days_ago = now - timedelta(days=7)

    # 1. Total tickets (7d)
    total_7d = (await db.execute(
        select(func.count(Ticket.id))
        .where(Ticket.org_id == org_id)
        .where(Ticket.created_at >= seven_days_ago)
    )).scalar() or 0

    # 2. Open tickets
    open_count = (await db.execute(
        select(func.count(Ticket.id))
        .where(Ticket.org_id == org_id)
        .where(Ticket.status != "resolved")
    )).scalar() or 0

    # 3. Avg response time
    avg_mins = await _calc_avg_response_time(db, org_id, seven_days_ago)

    # 4. Bot resolution %
    resolved = (await db.execute(
        select(func.count(Ticket.id))
        .where(Ticket.org_id == org_id, Ticket.status == "resolved")
    )).scalar() or 0
    bot_resolved = (await db.execute(
        select(func.count(Ticket.id))
        .where(Ticket.org_id == org_id, Ticket.status == "resolved", Ticket.needs_human == False)
    )).scalar() or 0
    bot_pct = round((bot_resolved / resolved * 100) if resolved > 0 else 0.0, 1)

    # 5. Daily volume (7 days)
    daily = await _daily_volume(db, org_id, seven_days_ago)

    # 6. Recent tickets
    recent_raw = (await db.execute(
        select(Ticket).where(Ticket.org_id == org_id)
        .order_by(Ticket.created_at.desc()).limit(5)
    )).scalars().all()
    recent = [RecentTicket(
        id=str(t.id), subject=t.subject, requester_name=t.requester_name,
        status=t.status, priority=t.priority, created_at=t.created_at.isoformat(),
        needs_human=t.needs_human,
    ) for t in recent_raw]

    return AnalyticsOverview(
        summary=AnalyticsSummary(
            total_tickets_7d=total_7d, open_tickets=open_count,
            avg_response_mins=avg_mins, bot_resolution_pct=bot_pct,
        ),
        daily_volume=daily,
        recent_tickets=recent,
    )


# ══════════════════════════════════════════════════════════════════════════════
# ENDPOINT 2: Deep Analytics
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/deep", response_model=AnalyticsDeep)
async def get_deep_analytics(
    days: int = Query(default=7, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Full analytics deep dive. Computes all 6 datasets in one response.
    Sentiment and clustering use sync OpenAI calls handled via run_in_executor.
    """
    return await _compute_deep(db, current_user.org_id, days)



async def _compute_deep(db: AsyncSession, org_id, days: int):
    now = datetime.now(timezone.utc)
    since = now - timedelta(days=days)

    period_label = f"Last {days} days" if days <= 90 else f"Last {days} days"

    # Total tickets in range
    total = (await db.execute(
        select(func.count(Ticket.id))
        .where(Ticket.org_id == org_id, Ticket.created_at >= since)
    )).scalar() or 0

    # ── 1. Satisfaction Trend ────────────────────────────────────────────
    satisfaction = await _satisfaction_trend(db, org_id, since, days)

    # ── 2. Top Questions (embedding clustering) ─────────────────────────
    top_questions = await _top_questions(db, org_id, since)

    # ── 3. Resolution Breakdown ─────────────────────────────────────────
    resolution = await _resolution_breakdown(db, org_id, since)

    # ── 4. Peak Hours Heatmap ───────────────────────────────────────────
    peak_hours = await _peak_hours(db, org_id, since)

    # ── 5. Escalation Rate Trend ────────────────────────────────────────
    escalation = await _escalation_trend(db, org_id, since, days)

    # ── 6. Response Time Trend ──────────────────────────────────────────
    response_times = await _response_time_trend(db, org_id, since, days)

    return AnalyticsDeep(
        period_label=period_label,
        total_tickets=total,
        satisfaction_trend=satisfaction,
        top_questions=top_questions,
        resolution=resolution,
        peak_hours=peak_hours,
        escalation_trend=escalation,
        response_time_trend=response_times,
    )


# ══════════════════════════════════════════════════════════════════════════════
# HELPERS
# ══════════════════════════════════════════════════════════════════════════════

async def _calc_avg_response_time(db, org_id, since) -> float:
    first_user = (
        select(Message.ticket_id, func.min(Message.created_at).label("t"))
        .join(Ticket).where(Ticket.org_id == org_id, Ticket.created_at >= since, Message.sender_type == "user")
        .group_by(Message.ticket_id).subquery()
    )
    first_reply = (
        select(Message.ticket_id, func.min(Message.created_at).label("t"))
        .join(Ticket).where(Ticket.org_id == org_id, Ticket.created_at >= since, Message.sender_type.in_(["bot", "agent"]))
        .group_by(Message.ticket_id).subquery()
    )
    result = await db.execute(
        select(func.avg(func.extract("epoch", first_reply.c.t - first_user.c.t) / 60))
        .select_from(first_user)
        .join(first_reply, first_user.c.ticket_id == first_reply.c.ticket_id)
    )
    val = result.scalar()
    return round(val, 1) if val else 0.0


async def _daily_volume(db, org_id, since) -> list:
    result = await db.execute(
        select(func.date(Ticket.created_at).label("day"), func.count(Ticket.id).label("cnt"))
        .where(Ticket.org_id == org_id, Ticket.created_at >= since)
        .group_by(func.date(Ticket.created_at))
        .order_by(func.date(Ticket.created_at))
    )
    counts = {str(r.day): r.cnt for r in result.all()}
    today = datetime.now(timezone.utc).date()
    return [
        DailyTicketCount(date=str(today - timedelta(days=i)), count=counts.get(str(today - timedelta(days=i)), 0))
        for i in range(6, -1, -1)
    ]


async def _satisfaction_trend(db, org_id, since, days) -> list:
    """
    Score unscored tickets, then aggregate daily satisfaction.
    """
    # First, score any tickets that haven't been scored yet (anger_score = 0)
    await _batch_score_sentiment(db, org_id, since)

    # Now aggregate
    result = await db.execute(
        select(
            func.date(Ticket.created_at).label("day"),
            func.avg(Ticket.anger_score).label("avg_anger"),
        )
        .where(Ticket.org_id == org_id, Ticket.created_at >= since)
        .group_by(func.date(Ticket.created_at))
        .order_by(func.date(Ticket.created_at))
    )
    scores_by_date = {str(r.day): r.avg_anger for r in result.all()}

    today = datetime.now(timezone.utc).date()
    points = []
    for i in range(days - 1, -1, -1):
        d = today - timedelta(days=i)
        anger = scores_by_date.get(str(d))
        # Convert anger (0=happy, 1=angry) to satisfaction (100=happy, 0=angry)
        sat = round(100 - (anger or 0.3) * 100, 1)
        points.append(SatisfactionPoint(date=str(d), score=sat))

    return points


async def _batch_score_sentiment(db, org_id, since):
    """Score tickets that haven't been scored yet using OpenAI."""
    # Find tickets with default anger_score (0.0 = unscored)
    result = await db.execute(
        select(Ticket.id, Ticket.subject)
        .where(Ticket.org_id == org_id, Ticket.created_at >= since, Ticket.anger_score == 0.0)
        .limit(50)
    )
    unscored = result.all()
    if not unscored:
        return

    # Get first user message for each ticket for better sentiment
    messages_for_scoring = []
    ticket_ids = []
    for ticket_id, subject in unscored:
        msg_result = await db.execute(
            select(Message.body)
            .where(Message.ticket_id == ticket_id, Message.sender_type == "user")
            .order_by(Message.created_at)
            .limit(1)
        )
        first_msg = msg_result.scalar()
        messages_for_scoring.append(first_msg or subject)
        ticket_ids.append(ticket_id)

    # Batch score via OpenAI (sync call wrapped in thread to avoid blocking)
    import asyncio
    from services.sentiment_service import score_messages_batch
    scores = await asyncio.to_thread(score_messages_batch, messages_for_scoring)

    # Update tickets
    for tid, score in zip(ticket_ids, scores):
        await db.execute(
            Ticket.__table__.update()
            .where(Ticket.id == tid)
            .values(anger_score=score)
        )
    await db.commit()


async def _top_questions(db, org_id, since) -> list:
    """Cluster tickets by content similarity using embeddings + LLM summaries."""
    # Fetch tickets with their first user message for deeper understanding
    result = await db.execute(
        select(Ticket.id, Ticket.subject)
        .where(Ticket.org_id == org_id, Ticket.created_at >= since)
    )
    tickets = result.all()

    if not tickets:
        return []

    # For each ticket, get the first user message (the actual complaint)
    ticket_data = []
    for ticket_id, subject in tickets:
        msg_result = await db.execute(
            select(Message.body)
            .where(Message.ticket_id == ticket_id, Message.sender_type == "user")
            .order_by(Message.created_at)
            .limit(1)
        )
        first_msg = msg_result.scalar()
        ticket_data.append({
            "subject": subject or "",
            "content": first_msg or subject or "",
        })

    from services.clustering_service import cluster_questions
    import asyncio
    clusters = await asyncio.to_thread(cluster_questions, ticket_data, 8)

    return [TopQuestion(question=c["question"], count=c["count"], summary=c.get("summary", "")) for c in clusters]


async def _resolution_breakdown(db, org_id, since) -> ResolutionBreakdown:
    bot = (await db.execute(
        select(func.count(Ticket.id))
        .where(Ticket.org_id == org_id, Ticket.created_at >= since,
               Ticket.status == "resolved", Ticket.needs_human == False)
    )).scalar() or 0

    human = (await db.execute(
        select(func.count(Ticket.id))
        .where(Ticket.org_id == org_id, Ticket.created_at >= since,
               Ticket.status == "resolved", Ticket.needs_human == True)
    )).scalar() or 0

    still_open = (await db.execute(
        select(func.count(Ticket.id))
        .where(Ticket.org_id == org_id, Ticket.created_at >= since,
               Ticket.status != "resolved")
    )).scalar() or 0

    return ResolutionBreakdown(bot_resolved=bot, human_resolved=human, still_open=still_open)


async def _peak_hours(db, org_id, since) -> PeakHoursData:
    """Build a 7x24 grid of ticket counts by day-of-week and hour."""
    result = await db.execute(
        select(
            extract("dow", Ticket.created_at).label("dow"),      # 0=Sun, 6=Sat
            extract("hour", Ticket.created_at).label("hour"),
            func.count(Ticket.id).label("cnt"),
        )
        .where(Ticket.org_id == org_id, Ticket.created_at >= since)
        .group_by("dow", "hour")
    )
    rows = result.all()

    # Build 7x24 grid (Mon=0 to Sun=6)
    # Postgres DOW: 0=Sun, 1=Mon, ..., 6=Sat → remap to Mon=0
    grid = [[0] * 24 for _ in range(7)]
    max_val = 0
    for row in rows:
        dow = int(row.dow)
        # Remap: Postgres 0=Sun→6, 1=Mon→0, 2=Tue→1, ...
        mapped = (dow - 1) % 7
        hour = int(row.hour)
        grid[mapped][hour] = row.cnt
        max_val = max(max_val, row.cnt)

    return PeakHoursData(grid=grid, max_value=max(max_val, 1))


async def _escalation_trend(db, org_id, since, days) -> list:
    """Daily escalation rate: % of tickets that needed human help."""
    # Get daily total and daily escalated counts
    total_result = await db.execute(
        select(func.date(Ticket.created_at).label("day"), func.count(Ticket.id).label("cnt"))
        .where(Ticket.org_id == org_id, Ticket.created_at >= since)
        .group_by(func.date(Ticket.created_at))
    )
    totals = {str(r.day): r.cnt for r in total_result.all()}

    esc_result = await db.execute(
        select(func.date(Ticket.created_at).label("day"), func.count(Ticket.id).label("cnt"))
        .where(Ticket.org_id == org_id, Ticket.created_at >= since, Ticket.needs_human == True)
        .group_by(func.date(Ticket.created_at))
    )
    escalated = {str(r.day): r.cnt for r in esc_result.all()}

    today = datetime.now(timezone.utc).date()
    points = []
    for i in range(days - 1, -1, -1):
        d = today - timedelta(days=i)
        t = totals.get(str(d), 0)
        e = escalated.get(str(d), 0)
        rate = round((e / t * 100) if t > 0 else 0, 1)
        points.append(EscalationPoint(date=str(d), rate=rate))

    return points


async def _response_time_trend(db, org_id, since, days) -> list:
    """Daily average response time split by bot vs human."""
    # For each ticket+day, find first user msg and first bot/agent reply
    # This is a complex query, so we do it per-type

    async def _avg_by_type(sender_types: list) -> dict:
        first_user = (
            select(Message.ticket_id, func.min(Message.created_at).label("t"))
            .join(Ticket).where(Ticket.org_id == org_id, Ticket.created_at >= since, Message.sender_type == "user")
            .group_by(Message.ticket_id).subquery()
        )
        first_reply = (
            select(Message.ticket_id, func.min(Message.created_at).label("t"))
            .join(Ticket).where(Ticket.org_id == org_id, Ticket.created_at >= since, Message.sender_type.in_(sender_types))
            .group_by(Message.ticket_id).subquery()
        )
        result = await db.execute(
            select(
                func.date(first_user.c.t).label("day"),
                func.avg(func.extract("epoch", first_reply.c.t - first_user.c.t) / 60).label("avg_mins"),
            )
            .select_from(first_user)
            .join(first_reply, first_user.c.ticket_id == first_reply.c.ticket_id)
            .group_by(func.date(first_user.c.t))
        )
        return {str(r.day): round(r.avg_mins, 2) for r in result.all()}

    bot_avgs = await _avg_by_type(["bot"])
    human_avgs = await _avg_by_type(["agent"])

    today = datetime.now(timezone.utc).date()
    points = []
    for i in range(days - 1, -1, -1):
        d = today - timedelta(days=i)
        points.append(ResponseTimePoint(
            date=str(d),
            bot_avg=bot_avgs.get(str(d), 0),
            human_avg=human_avgs.get(str(d), 0),
        ))

    return points
