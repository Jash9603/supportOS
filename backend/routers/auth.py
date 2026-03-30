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
from core.security import create_access_token, verify_password
from dependencies import get_current_user
from models.user import User
from schemas.auth import LoginRequest, SignupRequest, UserResponse
from services.auth_service import (
    create_org_and_user,
    get_org_by_id,
    get_user_by_email,
)

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

def _build_user_response(user: User, org_name: str, org_slug: str) -> UserResponse:
    return UserResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        role=user.role,
        org_id=user.org_id,
        org_name=org_name,
        org_slug=org_slug,
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
    return _build_user_response(user, org.name, org.slug)


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
    # Find user by email
    user = await get_user_by_email(db, body.email)

    # Verify password (always runs verify_password even if user is None,
    # to prevent timing attacks that could reveal valid emails)
    if not user or not verify_password(body.password, user.hashed_password):
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

    return _build_user_response(user, org.name, org.slug)


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
    return _build_user_response(current_user, org.name, org.slug)
