# -----------------------------------------------------------------------------
# schemas/auth.py — Request & Response Shapes for Auth Endpoints
# -----------------------------------------------------------------------------
# Pydantic schemas define exactly what JSON shape is expected IN (request body)
# and what shape is sent OUT (response body) for each auth endpoint.
#
# FastAPI uses these automatically:
#   - Validates incoming request JSON against the schema
#   - Rejects bad requests with a 422 error before they hit your route function
#   - Generates the correct API docs in /docs
#
# Schemas here:
#   SignupRequest  → body for POST /auth/signup
#   LoginRequest   → body for POST /auth/login
#   UserResponse   → what all auth endpoints return about the logged-in user
# -----------------------------------------------------------------------------

import uuid
from pydantic import BaseModel, EmailStr


class SignupRequest(BaseModel):
    name: str
    email: EmailStr       # validates it's a real email format, e.g. jash@acme.com
    password: str
    org_name: str         # e.g. "Acme Corp" → will become slug "acme-corp"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    """Returned after signup, login, and GET /auth/me — safe to send to frontend."""
    id: uuid.UUID
    email: str
    name: str
    role: str             # "owner" or "agent"
    org_id: uuid.UUID
    org_name: str         # org's display name (handy so frontend doesn't need a second API call)
    org_slug: str
    sub_status: str
    trial_ends_at: str | None = None
    subscription_ends_at: str | None = None

    model_config = {"from_attributes": True}  # allows building from SQLAlchemy model objects
