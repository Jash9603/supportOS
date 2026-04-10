# -----------------------------------------------------------------------------
# routers/auth.py — Authentication Endpoints
# -----------------------------------------------------------------------------
# This file handles everything related to user identity:
#
#   POST /auth/signup  → Create a new account + organisation
#   POST /auth/login   → Verify email & password, set login cookie
#   POST /auth/logout  → Clear the login cookie (log out)
#   GET  /auth/me      → Return the currently logged-in user's info
#
# How the httpOnly cookie works:
#   - On login/signup, we create a JWT (a signed token) and store it in a
#     cookie called "access_token" with httpOnly=True.
#   - httpOnly means JavaScript on the page CANNOT read it → XSS-safe.
#   - The browser automatically sends this cookie on every request to our API.
#   - Our `get_current_user` dependency reads it to identify who is making the request.
#   - On logout, we overwrite the cookie with an empty value and max_age=0,
#     which tells the browser to delete it immediately.
# -----------------------------------------------------------------------------

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.database import get_db
from core.security import create_access_token, verify_password, hash_password
from dependencies import get_current_user
from models.user import User
from models.organisation import Organisation
from pydantic import BaseModel
from schemas.auth import LoginRequest, SignupRequest, UserResponse
from services.auth_service import (
    create_org_and_user,
    get_org_by_id,
    get_user_by_email,
)

# -----------------------------------------------------------------------------
# Timing attack shield
# -----------------------------------------------------------------------------
# bcrypt.checkpw() takes ~100ms. If we skip it when the email doesn't exist,
# responses for unknown emails return in ~1ms vs ~100ms for known emails.
# An attacker can measure this difference and enumerate valid email addresses.
#
# Fix: ALWAYS run verify_password, even against a fake hash.
# This makes all login attempts take the same amount of time.
# Computed once at module import time — NOT inside the login function.
# -----------------------------------------------------------------------------
_DUMMY_HASH = hash_password("dummy-timing-shield")

router = APIRouter()


# ── Helper: build cookie ──────────────────────────────────────────────────────

def _set_auth_cookie(response: Response, token: str) -> None:
    """
    Attach the JWT as an httpOnly cookie to the response.
    Called from both signup and login — keeps cookie settings in one place.
    """
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,       # JS cannot read this cookie — XSS safe
        secure=False,        # Set True in production (requires HTTPS)
        samesite="lax",      # Sent on same-site + top-level nav — CSRF protection
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


# ── Helper: build UserResponse from DB objects ────────────────────────────────

def _build_user_response(user: User, org: Organisation) -> UserResponse:
    trial_str = org.trial_ends_at.isoformat() if org.trial_ends_at else None
    return UserResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        role=user.role,
        org_id=user.org_id,
        org_name=org.name,
        org_slug=org.slug,
        sub_status=org.sub_status,
        trial_ends_at=trial_str,
    )


# ── POST /auth/signup ─────────────────────────────────────────────────────────

@router.post("/signup", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def signup(
    body: SignupRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new organisation + owner user account.

    Steps:
      1. Check the email isn't already registered
      2. Create org + user in the DB (in one transaction)
      3. Create JWT with user info embedded
      4. Set it as an httpOnly cookie in the response
      5. Return UserResponse (safe user info — no password)
    """
    # 1. Prevent duplicate email
    existing = await get_user_by_email(db, body.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists",
        )

    # 2. Create org + user
    org, user = await create_org_and_user(
        db=db,
        name=body.name,
        email=body.email,
        password=body.password,
        org_name=body.org_name,
    )

    # 3. Create JWT — embed user_id, org_id, role so routes have context
    token = create_access_token({
        "sub": str(user.id),
        "org_id": str(org.id),
        "role": user.role,
    })

    # 4. Set httpOnly cookie
    _set_auth_cookie(response, token)

    # 5. Return user info
    return _build_user_response(user, org)


# ── POST /auth/login ──────────────────────────────────────────────────────────

@router.post("/login", response_model=UserResponse)
async def login(
    body: LoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """
    Login with email + password.

    We deliberately return the same vague error for "wrong email" and "wrong password"
    — this prevents attackers from knowing which emails are registered.
    """
    # Look up user by email first
    user = await get_user_by_email(db, body.email)

    # Always run verify_password regardless of whether the user exists.
    # Python's `or` short-circuits: `not user or not verify_password(...)` skips
    # verify_password when user is None — making non-existent email responses
    # measurably faster and leaking which emails are registered.
    # Using _DUMMY_HASH ensures bcrypt always runs for ~100ms on every attempt.
    password_ok = verify_password(
        body.password,
        user.hashed_password if user else _DUMMY_HASH,
    )

    if not user or not password_ok:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    # Load org for the response
    org = await get_org_by_id(db, user.org_id)

    # Create JWT + set cookie
    token = create_access_token({
        "sub": str(user.id),
        "org_id": str(org.id),
        "role": user.role,
    })
    _set_auth_cookie(response, token)

    return _build_user_response(user, org)


# ── POST /auth/logout ─────────────────────────────────────────────────────────

@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(response: Response):
    """
    Log out by deleting the auth cookie.
    Setting max_age=0 tells the browser to remove it immediately.
    """
    response.delete_cookie(
        key="access_token",
        httponly=True,
        samesite="lax",
    )


# ── GET /auth/me ──────────────────────────────────────────────────────────────

@router.get("/me", response_model=UserResponse)
async def me(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns the currently logged-in user's info.
    The `get_current_user` dependency reads the httpOnly cookie and loads the user.
    Frontend calls this on page load to check if session is still valid.
    """
    org = await get_org_by_id(db, current_user.org_id)
    return _build_user_response(current_user, org)
class ActivateSubRequest(BaseModel):
    subscription_id: str

@router.post("/activate-subscription")
async def activate_subscription(
    body: ActivateSubRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Called by frontend after PayPal approval.
    Saves the subscription ID and marks the org as 'active'.
    """
    from sqlalchemy import update
    await db.execute(
        update(Organisation)
        .where(Organisation.id == current_user.org_id)
        .values(
            paypal_sub_id=body.subscription_id,
            sub_status="active"
        )
    )
    await db.commit()
    return {"message": "Subscription activated successfully"}
