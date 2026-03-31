import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Float, ForeignKey, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from core.database import Base

class Ticket(Base):
    __tablename__ = "tickets"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("organisations.id"), nullable=False)
    
    channel: Mapped[str] = mapped_column(String(50), default="chat") # chat | email
    status: Mapped[str] = mapped_column(String(50), default="open") # open | pending | resolved
    priority: Mapped[str] = mapped_column(String(50), default="normal") # urgent | high | normal | low
    
    subject: Mapped[str] = mapped_column(String(255), nullable=False)
    requester_email: Mapped[str] = mapped_column(String(255), nullable=False)
    requester_name: Mapped[str] = mapped_column(String(255), nullable=False)
    
    assigned_to: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    anger_score: Mapped[float] = mapped_column(Float, default=0.0)
    topic_cluster: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    session_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True) # links to widget WS session
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
