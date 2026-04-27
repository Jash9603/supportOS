# -----------------------------------------------------------------------------
# models/kb_document.py - Knowledge Base Document Table
# -----------------------------------------------------------------------------
# A "kb_document" is a file that the founder uploads to train the AI bot.
# Examples: product FAQ PDF, pricing doc, refund policy .txt, etc.
#
# When uploaded:
#   1. This DB record is created with status = "processing"
#   2. A background Celery task splits the file into chunks and embeds them
#      into the Qdrant vector database (one collection per org)
#   3. Status updates to "indexed" when done, or "failed" on error
#
# The AI bot then searches these chunks when answering customer questions.
#
# Columns:
#   id          → unique ID (UUID)
#   org_id      → which org's knowledge base this belongs to (FK → organisations)
#   filename    → original uploaded filename, e.g. "refund_policy.pdf"
#   chunk_count → how many text chunks were extracted and stored in Qdrant
#   status      → "processing" | "indexed" | "failed"
#   indexed_at  → when embedding finished successfully (NULL until then)
#   created_at  → when the file was uploaded
# -----------------------------------------------------------------------------

import uuid
from datetime import datetime

from sqlalchemy import String, ForeignKey, DateTime, Integer, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base


class KbDocument(Base):
    __tablename__ = "kb_documents"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organisations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    filename: Mapped[str] = mapped_column(String(500), nullable=False)
    chunk_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    status: Mapped[str] = mapped_column(
        String(50), default="processing", nullable=False, index=True
    )  # processing | indexed | failed
    indexed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    def __repr__(self) -> str:
        return f"<KbDocument id={self.id} file={self.filename} status={self.status}>"
