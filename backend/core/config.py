# -----------------------------------------------------------------------------
# config.py — App Settings / Environment Variables
# -----------------------------------------------------------------------------
# This file reads all the secret values from the .env file (like database URL,
# API keys, allowed websites for CORS etc.) and makes them available everywhere
# in the app as a single `settings` object.
#
# Usage anywhere in the codebase:
#   from core.config import settings
#   print(settings.DATABASE_URL)
# -----------------------------------------------------------------------------

# No 'from typing import list' needed — list[str] is a native built-in in Python 3.11+
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str

    # Redis (Cloud)
    REDIS_URL: str

    # Qdrant (Cloud)
    QDRANT_URL: str
    QDRANT_API_KEY: str = ""

    # OpenAI
    OPENAI_API_KEY: str

    # Auth
    AUTH_SECRET: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # CORS — comma-separated origins
    ALLOWED_ORIGINS: str = "http://localhost:5173"

    # LangSmith (optional)
    LANGSMITH_API_KEY: str = ""
    LANGSMITH_PROJECT: str = "supportos-prod"

    # Lemon Squeezy
    LEMON_SQUEEZY_WEBHOOK_SECRET: str = ""

    @property
    def origins_list(self) -> list[str]:
        """Parse ALLOWED_ORIGINS into a list for FastAPI CORS middleware."""
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",")]

    model_config = {"env_file": "../.env", "extra": "ignore"}


settings = Settings()

# Force LangSmith configuration natively into standard OS environment variables
# (LangChain ignores Pydantic settings and only looks directly at os.environ)
import os
if settings.LANGSMITH_API_KEY:
    os.environ["LANGCHAIN_TRACING_V2"] = "true"
    os.environ["LANGCHAIN_API_KEY"] = settings.LANGSMITH_API_KEY
    os.environ["LANGCHAIN_PROJECT"] = settings.LANGSMITH_PROJECT
