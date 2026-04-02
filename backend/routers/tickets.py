import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from core.database import get_db
from core.redis import get_redis
from dependencies import get_current_user
from models.user import User
from models.ticket import Ticket
from schemas.ticket import TicketCreate, TicketResponse, TicketUpdate, MessageCreate, MessageResponse
import services.ticket_service as ticket_service

router = APIRouter()

@router.get("/", response_model=List[TicketResponse])
async def list_tickets(
    status: Optional[str] = None,
    channel: Optional[str] = None,
    assigned_to: Optional[uuid.UUID] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = select(Ticket).where(Ticket.org_id == current_user.org_id)
    
    if status is not None:
        query = query.where(Ticket.status == status)
    if channel is not None:
        query = query.where(Ticket.channel == channel)
    if assigned_to is not None:
        query = query.where(Ticket.assigned_to == assigned_to)
        
    query = query.order_by(Ticket.created_at.desc())
    result = await db.execute(query)
    
    tickets = result.scalars().all()
    # The messages relationship isn't eager loaded here to save overhead for the list view
    return tickets

@router.get("/{ticket_id}", response_model=TicketResponse)
async def get_ticket(
    ticket_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ticket = await ticket_service.get_ticket_with_messages(db, ticket_id)
    if ticket.org_id != current_user.org_id:
        raise HTTPException(status_code=403, detail="Not authorized to view this ticket")
    return ticket

@router.post("/", response_model=TicketResponse)
async def create_ticket(
    data: TicketCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Manually create a ticket from the dashboard. (Usually widget WS does this).
    """
    ticket = await ticket_service.create_ticket(db, current_user.org_id, data)
    return ticket

@router.patch("/{ticket_id}", response_model=TicketResponse)
async def patch_ticket(
    ticket_id: uuid.UUID,
    data: TicketUpdate,
    db: AsyncSession = Depends(get_db),
    redis = Depends(get_redis),
    current_user: User = Depends(get_current_user)
):
    ticket = await ticket_service.get_ticket_with_messages(db, ticket_id)
    if ticket.org_id != current_user.org_id:
        raise HTTPException(status_code=403, detail="Not authorized to update this ticket")
        
    updated_ticket = await ticket_service.update_ticket(db, ticket_id, data)
    
    # Notify connected agents about the update
    await ticket_service.publish_event(redis, f"tickets:{current_user.org_id}", "ticket_updated", {"ticket_id": str(ticket_id)})
    
    return updated_ticket

@router.post("/{ticket_id}/messages", response_model=MessageResponse)
async def add_message(
    ticket_id: uuid.UUID,
    data: MessageCreate,
    db: AsyncSession = Depends(get_db),
    redis = Depends(get_redis),
    current_user: User = Depends(get_current_user)
):
    ticket = await ticket_service.get_ticket_with_messages(db, ticket_id)
    if ticket.org_id != current_user.org_id:
        raise HTTPException(status_code=403, detail="Not authorized to update this ticket")
        
    # Since this is the authenticated router, we know it's coming from an agent
    message = await ticket_service.add_message(
        db=db, 
        redis_client=redis, 
        ticket=ticket, 
        sender_type="agent", 
        body=data.body,
        sender_id=str(current_user.id)
    )
    
    return message
