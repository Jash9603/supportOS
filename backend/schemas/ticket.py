from pydantic import BaseModel, ConfigDict
import uuid
from typing import List, Optional
from datetime import datetime

class MessageCreate(BaseModel):
    body: str

class MessageResponse(BaseModel):
    id: uuid.UUID
    ticket_id: uuid.UUID
    sender_type: str
    sender_id: Optional[str] = None
    body: str
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class TicketCreate(BaseModel):
    channel: str = "chat"
    subject: str
    requester_email: str
    requester_name: str
    session_id: Optional[str] = None

class TicketUpdate(BaseModel):
    status: Optional[str] = None
    priority: Optional[str] = None
    assigned_to: Optional[uuid.UUID] = None

class TicketResponse(BaseModel):
    id: uuid.UUID
    org_id: uuid.UUID
    channel: str
    status: str
    priority: str
    subject: str
    requester_email: str
    requester_name: str
    assigned_to: Optional[uuid.UUID] = None
    anger_score: float
    topic_cluster: Optional[str] = None
    session_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    resolved_at: Optional[datetime] = None
    messages: List[MessageResponse] = []

    model_config = ConfigDict(from_attributes=True)
