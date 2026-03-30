# -----------------------------------------------------------------------------
# security.py — Passwords & JWT Tokens
# -----------------------------------------------------------------------------
# This file handles two things:
#
#   1. PASSWORDS — hashing a plain password before storing it in the DB,
#      and checking if a plain password matches the stored hash.
#      We use the `bcrypt` library directly (not passlib — passlib 1.7.4 is
#      incompatible with bcrypt >= 4.0 and causes a startup crash).
#      bcrypt is a one-way hash — we NEVER store raw passwords.
#
#   2. JWT TOKENS — creating a signed login token when a user logs in,
#      and decoding/verifying that token on every protected request.
#      The token is stored in an httpOnly cookie so JS can't steal it.
# -----------------------------------------------------------------------------

import bcrypt
from datetime import datetime, timedelta, timezone   # timezone-aware, not deprecated utcnow()

from jose import jwt, JWTError

from core.config import settings

ALGORITHM = "HS256"


# ── Password hashing ──────────────────────────────────────────────────────────

def hash_password(password: str) -> str:
    """
    Hash a plain-text password using bcrypt.
    The result is a string like "$2b$12$..." — safe to store in the DB.
    bcrypt automatically adds a random salt, so the same password hashes
    differently each time (which is the correct behaviour).
    """
    password_bytes = password.encode("utf-8")
    hashed = bcrypt.hashpw(password_bytes, bcrypt.gensalt())
    return hashed.decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    """
    Check if a plain-text password matches the stored bcrypt hash.
    Returns True if they match, False otherwise.
    """
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


# ── JWT tokens ────────────────────────────────────────────────────────────────

def create_access_token(data: dict) -> str:
    """
    Create a signed JWT.
    'data' should include: {"sub": user_id, "org_id": org_id, "role": role}
    The token expires after ACCESS_TOKEN_EXPIRE_MINUTES (set in .env).
    """
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.AUTH_SECRET, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    """
    Decode and validate a JWT.
    Raises JWTError if the token is invalid, tampered with, or expired.
    """
    return jwt.decode(token, settings.AUTH_SECRET, algorithms=[ALGORITHM])
