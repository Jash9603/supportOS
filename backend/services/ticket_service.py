import json
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from fastapi import HTTPException
import uuid

from models.ticket import Ticket
from models.message import Message
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
    """Finds the most recent non-resolved ticket for a given session."""
    result = await db.execute(
        select(Ticket)
        .options(selectinload(Ticket.messages))
        .where(Ticket.org_id == org_id)
        .where(Ticket.session_id == session_id)
        .where(Ticket.status != "resolved")
        .order_by(Ticket.created_at.desc())
    )
    return result.scalars().first()

async def create_ticket(db: AsyncSession, org_id: uuid.UUID, data: TicketCreate) -> Ticket:
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

async def add_message(db: AsyncSession, redis_client, ticket: Ticket, sender_type: str, body: str, sender_id: str = None) -> Message:
    new_message = Message(
        ticket_id=ticket.id,
        sender_type=sender_type,
        sender_id=sender_id,
        body=body
    )
    db.add(new_message)
    await db.commit()
    await db.refresh(new_message)
    
    # 1. Publish to the specific conversation session (if a customer widget is waiting)
    if ticket.session_id:
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
    
    return new_message
