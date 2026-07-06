# -----------------------------------------------------------------------------
# models/ticket_batch.py - TicketBatch Table
# -----------------------------------------------------------------------------
# Tracks individual purchases or grants of AI tickets for an organisation.
# This allows each purchase to have its own independent expiry date.
# -----------------------------------------------------------------------------

import uuid
from datetime import datetime

from sqlalchemy import Integer, DateTime, func, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.database import Base


class TicketBatch(Base):
    __tablename__ = "ticket_batches"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organisations.id", ondelete="CASCADE"), nullable=False
    )
    
    initial_tickets: Mapped[int] = mapped_column(Integer, nullable=False)
    remaining_tickets: Mapped[int] = mapped_column(Integer, nullable=False)
    
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    def __repr__(self) -> str:
        return f"<TicketBatch id={self.id} org_id={self.org_id} remaining={self.remaining_tickets}>"
