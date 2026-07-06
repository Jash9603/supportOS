import json
import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from sqlalchemy.orm import selectinload
from fastapi import HTTPException
import uuid

from models.ticket import Ticket
from models.message import Message
from models.notification import Notification
from schemas.ticket import TicketCreate, TicketUpdate

async def get_ticket_with_messages(db: AsyncSession, ticket_id: uuid.UUID) -> Ticket:
    result = await db.execute(
        select(Ticket)
        .options(selectinload(Ticket.messages))
        .where(Ticket.id == ticket_id)
    )
    ticket = result.scalars().first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return ticket

async def get_ticket_by_session(db: AsyncSession, org_id: uuid.UUID, session_id: str) -> Ticket:
    """Finds the most recent ticket for a given session (including resolved ones)."""
    result = await db.execute(
        select(Ticket)
        .options(selectinload(Ticket.messages))
        .where(Ticket.org_id == org_id)
        .where(Ticket.session_id == session_id)
        .order_by(Ticket.created_at.desc())
    )
    return result.scalars().first()

async def create_ticket(db: AsyncSession, org_id: uuid.UUID, data: TicketCreate) -> Ticket:
    from models.organisation import Organisation
    from models.ticket_batch import TicketBatch
    from sqlalchemy.sql.expression import nulls_last
    
    # 1. Fetch the organisation
    org_res = await db.execute(select(Organisation).where(Organisation.id == org_id))
    org = org_res.scalars().first()
    
    if not org:
        raise HTTPException(status_code=404, detail="Organisation not found")
        
    # 2. Find the active TicketBatch that expires soonest
    batches_res = await db.execute(
        select(TicketBatch)
        .where(TicketBatch.org_id == org_id)
        .where(TicketBatch.remaining_tickets > 0)
        .where((TicketBatch.expires_at == None) | (TicketBatch.expires_at > func.now()))
        .order_by(nulls_last(TicketBatch.expires_at.asc()), TicketBatch.created_at.asc())
    )
    valid_batch = batches_res.scalars().first()

    if not valid_batch:
        raise HTTPException(status_code=403, detail="Ticket quota exceeded. Please upgrade your plan.")
        
    # 3. Deduct a ticket from the batch and update total usage
    valid_batch.remaining_tickets -= 1
    org.total_tickets_used += 1
    if org.available_tickets > 0:
        org.available_tickets -= 1

    # 3. Create the ticket
    new_ticket = Ticket(
        org_id=org_id,
        channel=data.channel,
        subject=data.subject,
        requester_email=data.requester_email,
        requester_name=data.requester_name,
        session_id=data.session_id
    )
    db.add(new_ticket)
    await db.commit()
    await db.refresh(new_ticket)
    # The models relationship would automatically populate messages if configured,
    # but we will just return the newly created ticket manually with empty messages.
    new_ticket.messages = []
    
    return new_ticket

async def update_ticket(db: AsyncSession, ticket_id: uuid.UUID, data: TicketUpdate) -> Ticket:
    ticket = await get_ticket_with_messages(db, ticket_id)
    
    if data.status is not None:
        ticket.status = data.status
    if data.priority is not None:
        ticket.priority = data.priority
    if data.assigned_to is not None:
        ticket.assigned_to = data.assigned_to
    if data.needs_human is not None:
        ticket.needs_human = data.needs_human
        
    await db.commit()
    await db.refresh(ticket)
    return ticket

async def publish_event(redis_client, channel: str, event_type: str, payload: dict):
    """
    Publishes an event to a Redis channel.
    `channel` should be something like "tickets:{org_id}" or "conv:{session_id}"
    """
    if redis_client is None:
        return
        
    msg = {
        "type": event_type,
        **payload
    }
    # To avoid Pydantic/UUID serialization issues, ensure payload dict is stringified safely elsewhere or here
    await redis_client.publish(channel, json.dumps(msg, default=str))


# ══════════════════════════════════════════════════════════════════════════════
# NOTIFICATION HELPERS
# ══════════════════════════════════════════════════════════════════════════════

async def create_notification(
    db: AsyncSession,
    redis_client,
    org_id: uuid.UUID,
    notif_type: str,
    title: str,
    body: str = None,
    ticket_id: uuid.UUID = None,
):
    """
    Create a persistent notification in the DB and publish it via Redis
    so the dashboard receives it in real-time.
    """
    notif = Notification(
        org_id=org_id,
        type=notif_type,
        title=title,
        body=body,
        ticket_id=ticket_id,
    )
    db.add(notif)
    await db.commit()
    await db.refresh(notif)

    # Push to the org's dashboard channel so the bell icon updates instantly
    await publish_event(redis_client, f"tickets:{org_id}", "notification", {
        "id": str(notif.id),
        "notif_type": notif_type,
        "title": title,
        "body": body or "",
        "ticket_id": str(ticket_id) if ticket_id else None,
        "created_at": notif.created_at.isoformat(),
    })

    return notif


async def add_message(db: AsyncSession, redis_client, ticket: Ticket, sender_type: str, body: str, sender_id: str = None, skip_ws_publish: bool = False) -> Message:
    new_message = Message(
        ticket_id=ticket.id,
        sender_type=sender_type,
        sender_id=sender_id,
        body=body,
        created_at=datetime.datetime.now(datetime.timezone.utc)
    )
    db.add(new_message)
    await db.commit()
    await db.refresh(new_message)
    
    # 1. Publish to the customer's widget session - but ONLY for agent/bot replies.
    #    The customer already sees their own message instantly (optimistic rendering).
    #    skip_ws_publish=True when the bot already streamed tokens directly over WebSocket.
    if ticket.session_id and sender_type != "user" and not skip_ws_publish:
        await publish_event(redis_client, f"conv:{ticket.session_id}", "message", {
            "id": str(new_message.id),
            "body": new_message.body,
            "sender_type": new_message.sender_type,
            "created_at": str(new_message.created_at)
        })
        
    # 2. Publish to the org's inbox queue
    await publish_event(redis_client, f"tickets:{ticket.org_id}", "new_message", {
        "ticket_id": str(ticket.id),
        "message_id": str(new_message.id)
    })

    # 3. Create a notification for customer messages (not bot/agent replies)
    if sender_type == "user":
        truncated_body = (body[:80] + "…") if len(body) > 80 else body
        await create_notification(
            db, redis_client,
            org_id=ticket.org_id,
            notif_type="new_message",
            title=f"New message on: {ticket.subject[:60]}",
            body=truncated_body,
            ticket_id=ticket.id,
        )
    
    return new_message
