# -----------------------------------------------------------------------------
# security.py — Passwords & JWT Tokens
# -----------------------------------------------------------------------------
# This file handles two things:
#
#   1. PASSWORDS — hashing a plain password before storing it in the DB,
#      and checking if a plain password matches the stored hash.
#      (We use bcrypt — a one-way hash, so we never store raw passwords.)
#
#   2. JWT TOKENS — creating a signed login token when a user logs in,
#      and decoding/verifying that token on every protected request.
#      The token is stored in an httpOnly cookie so JS can't steal it.
# -----------------------------------------------------------------------------

from datetime import datetime, timedelta, timezone  # timezone-aware, not deprecated utcnow()

from jose import jwt, JWTError
from passlib.context import CryptContext

from core.config import settings

ALGORITHM = "HS256"

# bcrypt password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(data: dict) -> str:
    """
    Create a signed JWT.
    'data' should include at minimum: {"sub": user_id, "org_id": org_id, "role": role}
    """
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.AUTH_SECRET, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    """
    Decode and validate a JWT. Raises JWTError if invalid or expired.
    """
    return jwt.decode(token, settings.AUTH_SECRET, algorithms=[ALGORITHM])
