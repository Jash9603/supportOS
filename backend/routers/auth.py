# -----------------------------------------------------------------------------
# routers/auth.py — Authentication Endpoints (Login / Signup / Logout)
# -----------------------------------------------------------------------------
# This file handles everything related to user identity:
#
#   POST /auth/signup  → Create a new account + organisation
#   POST /auth/login   → Check email & password, set login cookie
#   POST /auth/logout  → Clear the login cookie (log out)
#   GET  /auth/me      → Return the currently logged-in user's info
#
# How auth works:
#   - When a user logs in, we create a JWT (a signed token) and store it in
#     an httpOnly cookie. The browser sends this cookie automatically on every
#     request — so routes can verify who the user is without needing a header.
#   - httpOnly means JavaScript on the page can't read it → XSS-safe.
#
# Currently this file is a STUB (Piece 1.2). Full implementation in Piece 1.4.
# -----------------------------------------------------------------------------

from fastapi import APIRouter

router = APIRouter()


@router.get("/ping")
async def auth_ping():
    """Temporary stub — confirms auth router is mounted correctly."""
    return {"router": "auth", "status": "ok"}
