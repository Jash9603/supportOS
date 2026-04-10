# -----------------------------------------------------------------------------
# models/organisation.py — Organisation Table
# -----------------------------------------------------------------------------
# An "organisation" is the company/startup that signed up for SupportOS.
# Every piece of data in the app (users, tickets, KB docs) is owned by an org.
# This is how we keep one customer's data completely separate from another's.
#
# Columns:
#   id                   → unique ID for the org (UUID)
#   name                 → display name, e.g. "Acme Corp"
#   slug                 → URL-safe short name, e.g. "acme-corp" (must be unique)
#   plan                 → subscription tier: "free" | "pro" | "enterprise"
#   chatbot_enabled      → whether the AI chatbot is turned on for this org
#   chatbot_config       → JSON blob: bot name, greeting message, color, etc.
#   onboarding_completed → True once the founder finishes the setup wizard
#   created_at           → when the org was created
# -----------------------------------------------------------------------------

import uuid
from datetime import datetime

from sqlalchemy import String, Boolean, DateTime, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base


class Organisation(Base):
    __tablename__ = "organisations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    plan: Mapped[str] = mapped_column(String(50), default="free", nullable=False)
    chatbot_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    chatbot_config: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    allowed_domains: Mapped[list[str]] = mapped_column(JSONB, default=list, nullable=False)
    
    # Billing
    paypal_sub_id: Mapped[str] = mapped_column(String(255), nullable=True)
    sub_status: Mapped[str] = mapped_column(String(50), default="inactive", nullable=False)
    trial_ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    
    onboarding_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    def __repr__(self) -> str:
        return f"<Organisation id={self.id} slug={self.slug}>"
