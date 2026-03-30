# -----------------------------------------------------------------------------
# models/message.py — Message Table
# -----------------------------------------------------------------------------
# A "message" is a single chat bubble inside a ticket conversation.
# Every time someone sends a message — customer, agent, or AI bot —
# it gets stored here, linked to its parent ticket.
#
# sender_type tells us who sent it:
#   "user"  → the customer/visitor using the chat widget
#   "agent" → a support team member replying from the inbox
#   "bot"   → the AI assistant auto-responding
#
# Columns:
#   id          → unique ID (UUID)
#   ticket_id   → which conversation this message belongs to (FK → tickets)
#   sender_type → "user" | "agent" | "bot"
#   sender_id   → ID of the agent who sent it (NULL for user/bot messages)
#   body        → the actual text of the message
#   created_at  → when the message was sent
# -----------------------------------------------------------------------------

import uuid
from datetime import datetime

from sqlalchemy import String, ForeignKey, DateTime, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    ticket_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tickets.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    sender_type: Mapped[str] = mapped_column(String(50), nullable=False)  # user | agent | bot
    sender_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    def __repr__(self) -> str:
        return f"<Message id={self.id} sender={self.sender_type} ticket={self.ticket_id}>"
