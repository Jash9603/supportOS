# -----------------------------------------------------------------------------
# models/ticket.py — Ticket Table
# -----------------------------------------------------------------------------
# A "ticket" is created every time a customer starts a conversation.
# It groups all the messages from that conversation in one place and tracks
# its progress from "open" to "resolved".
#
# Think of it like an email thread — one ticket = one support conversation.
#
# Columns:
#   id               → unique ID (UUID)
#   org_id           → which org owns this ticket (FK → organisations)
#   channel          → how the customer contacted us: "chat" | "email" | "slack"
#   status           → current state: "open" | "pending" | "resolved"
#   priority         → urgency level: "urgent" | "high" | "normal" | "low"
#   subject          → short description of the issue, e.g. "Can't reset password"
#   requester_email  → customer's email (may be blank for anonymous chat)
#   requester_name   → customer's name (may be blank)
#   assigned_to      → which agent is handling this (FK → users, can be NULL)
#   session_id       → links the ticket to the customer's live WebSocket session
#   anger_score      → 0.0–1.0 float. High = frustrated customer. Set by AI.
#   topic_cluster    → AI-detected category, e.g. "billing", "account", "bug"
#   needs_human      → True when the AI has escalated and a human must respond
#   created_at       → when the ticket was first created
#   updated_at       → last time anything changed on the ticket
#   resolved_at      → when the ticket was marked resolved (NULL if still open)
# -----------------------------------------------------------------------------

import uuid
from datetime import datetime

from sqlalchemy import String, ForeignKey, DateTime, Float, Boolean, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base


class Ticket(Base):
    __tablename__ = "tickets"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organisations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    channel: Mapped[str] = mapped_column(String(50), default="chat", nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="open", nullable=False, index=True)
    priority: Mapped[str] = mapped_column(String(50), default="normal", nullable=False)
    subject: Mapped[str] = mapped_column(String(500), nullable=False)
    requester_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    requester_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    assigned_to: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    session_id: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    anger_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    topic_cluster: Mapped[str | None] = mapped_column(String(100), nullable=True)
    needs_human: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    def __repr__(self) -> str:
        return f"<Ticket id={self.id} status={self.status} subject={self.subject[:30]}>"
