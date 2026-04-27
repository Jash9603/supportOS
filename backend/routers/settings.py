# routers/settings.py - Profile & Organisation Settings API

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from core.database import get_db
from dependencies import get_current_user
from models.user import User
from models.organisation import Organisation
from schemas.settings import UpdateProfileRequest, UpdateOrgRequest
from schemas.auth import UserResponse
from services.auth_service import get_org_by_id

router = APIRouter()


@router.patch("/profile", response_model=UserResponse)
async def update_profile(
    body: UpdateProfileRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update the logged-in user's display name."""
    if body.name is not None:
        name = body.name.strip()
        if len(name) < 1 or len(name) > 255:
            raise HTTPException(status_code=400, detail="Name must be 1-255 characters")
        current_user.name = name

    await db.commit()
    await db.refresh(current_user)

    org = await get_org_by_id(db, current_user.org_id)
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        name=current_user.name,
        role=current_user.role,
        org_id=current_user.org_id,
        org_name=org.name,
        org_slug=org.slug,
        sub_status=org.sub_status if hasattr(org, 'sub_status') else 'trial',
        trial_ends_at=str(org.trial_ends_at) if hasattr(org, 'trial_ends_at') and org.trial_ends_at else None,
        subscription_ends_at=str(org.subscription_ends_at) if hasattr(org, 'subscription_ends_at') and org.subscription_ends_at else None,
    )


@router.patch("/org", response_model=UserResponse)
async def update_org(
    body: UpdateOrgRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update the organisation name. Owner only."""
    if current_user.role != "owner":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the organisation owner can change org settings",
        )

    org = await get_org_by_id(db, current_user.org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organisation not found")

    if body.name is not None:
        name = body.name.strip()
        if len(name) < 1 or len(name) > 255:
            raise HTTPException(status_code=400, detail="Org name must be 1-255 characters")
        org.name = name

    await db.commit()
    await db.refresh(org)

    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        name=current_user.name,
        role=current_user.role,
        org_id=current_user.org_id,
        org_name=org.name,
        org_slug=org.slug,
        sub_status=org.sub_status if hasattr(org, 'sub_status') else 'trial',
        trial_ends_at=str(org.trial_ends_at) if hasattr(org, 'trial_ends_at') and org.trial_ends_at else None,
        subscription_ends_at=str(org.subscription_ends_at) if hasattr(org, 'subscription_ends_at') and org.subscription_ends_at else None,
    )
