# -----------------------------------------------------------------------------
# dependencies.py - Shared FastAPI Dependencies
# -----------------------------------------------------------------------------
# FastAPI "dependencies" are reusable functions that routes can declare as
# parameters. FastAPI runs them automatically before the route function.
#
# The key dependency here is `get_current_user`:
#   - Reads the httpOnly cookie called "access_token" from the request
#   - Decodes and validates the JWT inside it
#   - Loads the matching User from the database
#   - Returns the User object to the route
#   - Raises HTTP 401 if cookie is missing, token is expired, or user not found
#
# Usage in any protected route:
#   from dependencies import get_current_user
#
#   @router.get("/protected")
#   async def my_route(current_user: User = Depends(get_current_user)):
#       return {"hello": current_user.name}
# -----------------------------------------------------------------------------

import uuid

from fastapi import Cookie, Depends, HTTPException, status
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.security import decode_token
from models.user import User
from services.auth_service import get_user_by_id


async def get_current_user(
    access_token: str | None = Cookie(default=None),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    FastAPI dependency - reads the httpOnly cookie and returns the logged-in user.

    Flow:
      1. Read 'access_token' from the request cookie
      2. Decode the JWT to get the user_id stored inside it
      3. Load the User from DB using that user_id
      4. Return the User (or raise 401 if anything fails)

    The cookie name 'access_token' must match exactly what we set in the login route.
    """
    # 1. Cookie missing entirely
    if not access_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated - please log in",
        )

    try:
        # 2. Decode JWT and extract the user id
        payload = decode_token(access_token)
        user_id_str: str = payload.get("sub")
        if not user_id_str:
            raise ValueError("Token has no 'sub' field")
        user_id = uuid.UUID(user_id_str)
    except (JWTError, ValueError, Exception):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token - please log in again",
        )

    # 3. Load user from DB
    user = await get_user_by_id(db, user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    return user
