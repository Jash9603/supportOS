# Chatbot / Knowledge Base Pydantic schemas
from pydantic import BaseModel, ConfigDict
import uuid
from typing import Optional
from datetime import datetime


class KbDocumentResponse(BaseModel):
    """Response schema for a single knowledge base document."""
    id: uuid.UUID
    org_id: uuid.UUID
    filename: str
    chunk_count: int
    status: str             # processing | indexed | failed
    indexed_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ChatbotToggle(BaseModel):
    """Body for toggling the chatbot on/off."""
    chatbot_enabled: bool


class ChatbotTestRequest(BaseModel):
    """Body for the test preview endpoint."""
    question: str
