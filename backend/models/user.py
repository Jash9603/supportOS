# -----------------------------------------------------------------------------
# models/user.py - User Table
# -----------------------------------------------------------------------------
# A "user" is a human who logs into the SupportOS dashboard.
# Users always belong to exactly one organisation.
#
# Roles:
#   "owner" → the founder who created the org. Has full access.
#   "agent" → a support team member invited by the owner. Can manage tickets.
#
# Note: website visitors who chat with the widget are NOT users -
# they're anonymous and tracked only by their session ID on tickets.
#
# Columns:
#   id              → unique ID (UUID)
#   org_id          → which organisation this user belongs to (FK → organisations)
#   email           → login email (must be unique across the whole platform)
#   name            → display name, e.g. "Jash Patel"
#   hashed_password → bcrypt hash of the password. Raw password is NEVER stored.
#   role            → "owner" or "agent"
#   created_at      → when the account was created
# -----------------------------------------------------------------------------

import uuid
from datetime import datetime

from sqlalchemy import String, ForeignKey, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organisations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(50), default="owner", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email} role={self.role}>"
