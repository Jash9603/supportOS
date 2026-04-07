# schemas/settings.py — Request models for Settings API

from pydantic import BaseModel
from typing import Optional


class UpdateProfileRequest(BaseModel):
    name: Optional[str] = None


class UpdateOrgRequest(BaseModel):
    name: Optional[str] = None
