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

    # Deployment URLs
    FRONTEND_URL: str = "http://localhost:5173"
    BACKEND_URL: str = "http://localhost:8000"

    # CORS — comma-separated origins
    ALLOWED_ORIGINS: str = "http://localhost:5173,https://support-os-omega.vercel.app"

    # LangSmith (optional)
    LANGSMITH_API_KEY: str = ""
    LANGSMITH_PROJECT: str = "supportos-prod"

    # Dodo Payments
    DODO_API_KEY: str = ""
    DODO_WEBHOOK_SECRET: str = ""
    DODO_MONTHLY_PRODUCT_ID: str = ""
    DODO_YEARLY_PRODUCT_ID: str = ""

    # Contact / SMTP
    CONTACT_EMAIL: str = "jashkevdiya@gmail.com"
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASS: str = ""

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
