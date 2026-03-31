import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Text, ForeignKey, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from core.database import Base

class Message(Base):
    __tablename__ = "messages"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticket_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False)
    
    sender_type: Mapped[str] = mapped_column(String(50), nullable=False) # user | agent | bot
    sender_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True) # could be UUID or 'bot' or session string
    
    body: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
