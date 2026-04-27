# -----------------------------------------------------------------------------
# schemas/analytics.py - Response Models for the Analytics API
# -----------------------------------------------------------------------------

from pydantic import BaseModel
from typing import List, Optional
from datetime import date


# ── Overview (Phase 4.1) ─────────────────────────────────────────────────────

class AnalyticsSummary(BaseModel):
    total_tickets_7d: int
    open_tickets: int
    avg_response_mins: float
    bot_resolution_pct: float


class DailyTicketCount(BaseModel):
    date: str
    count: int


class RecentTicket(BaseModel):
    id: str
    subject: str
    requester_name: str
    status: str
    priority: str
    created_at: str
    needs_human: bool


class AnalyticsOverview(BaseModel):
    summary: AnalyticsSummary
    daily_volume: List[DailyTicketCount]
    recent_tickets: List[RecentTicket]


# ── Deep Analytics (Phase 4.5) ───────────────────────────────────────────────

class SatisfactionPoint(BaseModel):
    """One data point for the satisfaction trend chart."""
    date: str
    score: float          # 0-100 where 100 = fully satisfied


class TopQuestion(BaseModel):
    """A cluster of similar customer questions."""
    question: str
    count: int
    summary: str = ""


class ResolutionBreakdown(BaseModel):
    """How tickets were resolved."""
    bot_resolved: int
    human_resolved: int
    still_open: int


class PeakHoursData(BaseModel):
    """Ticket volume by hour and day of week."""
    # 7 rows (Mon=0 to Sun=6), each with 24 values (hours 0-23)
    grid: List[List[int]]
    max_value: int         # Max cell value (for color scale)


class EscalationPoint(BaseModel):
    """Escalation rate for a single day."""
    date: str
    rate: float            # 0-100 percentage


class ResponseTimePoint(BaseModel):
    """Response time comparison for a single day."""
    date: str
    bot_avg: float         # Minutes
    human_avg: float       # Minutes


class AnalyticsDeep(BaseModel):
    """Everything the deep analytics page needs in one response."""
    period_label: str                            # "Last 7 days", "Apr 1 - Apr 7, 2026"
    total_tickets: int
    satisfaction_trend: List[SatisfactionPoint]
    top_questions: List[TopQuestion]
    resolution: ResolutionBreakdown
    peak_hours: PeakHoursData
    escalation_trend: List[EscalationPoint]
    response_time_trend: List[ResponseTimePoint]
