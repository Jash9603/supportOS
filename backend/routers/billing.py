import hmac
import hashlib
import json
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import update
from uuid import UUID

from core.database import get_db
from core.config import settings
from models.organisation import Organisation
from models.user import User
from dependencies import get_current_user

router = APIRouter()

@router.post("/webhook")
async def lemonsqueezy_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """
    Handles Lemon Squeezy webhook events.
    Verifies the signature using the secret set in the dashboard.
    """
    payload = await request.body()
    signature = request.headers.get("x-signature")

    # Verify signature
    if settings.LEMON_SQUEEZY_WEBHOOK_SECRET:
        secret = settings.LEMON_SQUEEZY_WEBHOOK_SECRET.encode('utf-8')
        expected_sig = hmac.new(secret, payload, hashlib.sha256).hexdigest()

        if not hmac.compare_digest(expected_sig, signature):
            raise HTTPException(status_code=400, detail="Invalid signature")

    data = json.loads(payload)
    event_name = data.get('meta', {}).get('event_name')
    obj = data.get('data', {})

    if event_name in ['subscription_created', 'subscription_updated']:
        # Extract custom data which we pass in the checkout URL
        custom_data = data.get('meta', {}).get('custom_data', {})
        org_id = custom_data.get('org_id')
        
        # In Lemon Squeezy, `status` becomes "active" when paid
        status = obj.get('attributes', {}).get('status')
        sub_id = obj.get('id')

        if org_id and status in ['active', 'past_due', 'trialing']:
            await db.execute(
                update(Organisation)
                .where(Organisation.id == UUID(org_id))
                .values(
                    paypal_sub_id=str(sub_id), # Reusing this column name for simplicity
                    sub_status="active"
                )
            )
            await db.commit()

    elif event_name in ['subscription_cancelled', 'subscription_expired']:
        sub_id = obj.get('id')
        await db.execute(
            update(Organisation)
            .where(Organisation.paypal_sub_id == str(sub_id))
            .values(sub_status="inactive")
        )
        await db.commit()

    return {"status": "success"}

from pydantic import BaseModel

class ReferralRequest(BaseModel):
    code: str

@router.post("/referral")
async def apply_referral(
    body: ReferralRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Bypasses the billing wall if a valid admin referral code is used.
    """
    if body.code.strip() != "JASH2005":
        raise HTTPException(status_code=400, detail="Invalid referral code")

    await db.execute(
        update(Organisation)
        .where(Organisation.id == current_user.org_id)
        .values(
            paypal_sub_id="referral_bypass",
            sub_status="active"
        )
    )
    await db.commit()

    return {"message": "Referral applied successfully. Welcome to SupportOS!"}
