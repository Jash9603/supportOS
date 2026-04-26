# -----------------------------------------------------------------------------
# routers/notifications.py — In-app Notification Endpoints
# -----------------------------------------------------------------------------
#
# THREE ENDPOINTS:
#   GET  /notifications           — Fetch recent notifications for the user's org
#   PATCH /notifications/{id}/read — Mark one notification as read
#   PATCH /notifications/read-all  — Mark all unread notifications as read
# -----------------------------------------------------------------------------

import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_, update, desc

from core.database import get_db
from dependencies import get_current_user
from models.user import User
from models.notification import Notification

router = APIRouter()


@router.get("/")
async def list_notifications(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Fetch the latest 30 notifications for the user's org.
    Returns unread first, then recent read ones.
    """
    result = await db.execute(
        select(Notification)
        .where(Notification.org_id == current_user.org_id)
        .order_by(Notification.is_read.asc(), Notification.created_at.desc())
        .limit(30)
    )
    notifications = result.scalars().all()

    # Count total unread
    unread_result = await db.execute(
        select(Notification.id)
        .where(
            Notification.org_id == current_user.org_id,
            Notification.is_read == False,
        )
    )
    unread_count = len(unread_result.all())

    return {
        "notifications": [
            {
                "id": str(n.id),
                "type": n.type,
                "title": n.title,
                "body": n.body,
                "ticket_id": str(n.ticket_id) if n.ticket_id else None,
                "is_read": n.is_read,
                "created_at": n.created_at.isoformat(),
            }
            for n in notifications
        ],
        "unread_count": unread_count,
    }


@router.patch("/{notification_id}/read")
async def mark_read(
    notification_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark a single notification as read."""
    result = await db.execute(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.org_id == current_user.org_id,
        )
    )
    notif = result.scalars().first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")

    notif.is_read = True
    await db.commit()
    return {"ok": True}


@router.patch("/read-all")
async def mark_all_read(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark all unread notifications as read for the user's org."""
    await db.execute(
        update(Notification)
        .where(
            Notification.org_id == current_user.org_id,
            Notification.is_read == False,
        )
        .values(is_read=True)
    )
    await db.commit()
    return {"ok": True}
