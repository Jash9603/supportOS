import hmac
import hashlib
import json
import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import update
from uuid import UUID
from pydantic import BaseModel

from core.database import get_db
from core.config import settings
from models.organisation import Organisation
from models.user import User
from dependencies import get_current_user

router = APIRouter()

class CheckoutRequest(BaseModel):
    plan: str
    success_url: str
    cancel_url: str

@router.post("/create-checkout")
async def create_checkout(
    body: CheckoutRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Generate an authenticated checkout session via Dodo Payments API
    """
    if body.plan == "starter":
        product_id = settings.DODO_STARTER_PRODUCT_ID
    elif body.plan == "growth":
        product_id = settings.DODO_GROWTH_PRODUCT_ID
    else:
        raise HTTPException(status_code=400, detail="Invalid plan selected")

    if not product_id:
        raise HTTPException(status_code=500, detail="Product ID missing in configuration")

    # Use test mode URL for development, switch to live for production
    url = "https://live.dodopayments.com/checkouts"  # LIVE
    # url = "https://test.dodopayments.com/checkouts"  # TEST
    
    payload = {
        "product_cart": [
            {
                "product_id": product_id,
                "quantity": 1
            }
        ],
        "return_url": body.success_url,
        "metadata": {
            "org_id": str(current_user.org_id)
        }
    }

    headers = {
        "Authorization": f"Bearer {settings.DODO_API_KEY}",
        "Content-Type": "application/json"
    }

    try:
        api_key = settings.DODO_API_KEY or ""
        print(f"[DEBUG] DODO_API_KEY = '{api_key[:8]}...{api_key[-4:]}' (len={len(api_key)})")
        print(f"[DEBUG] Authorization header = '{headers['Authorization']}'")
        print(f"[DEBUG] Dodo URL = {url}")
        print(f"[DEBUG] Payload = {payload}")
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.post(url, json=payload, headers=headers)
            
            if res.status_code >= 400:
                print("Dodo checkout error details:", res.status_code, res.text)
                raise HTTPException(
                    status_code=400, 
                    detail=f"Dodo API rejected the request. Details: {res.text[:200]}"
                )
                
            data = res.json()
            return data
    except HTTPException:
        # Re-raise explicit HTTP exceptions so they don't get swallowed into 500s
        raise
    except httpx.RequestError as e:
        print(f"Network error calling Dodo: {e}")
        raise HTTPException(status_code=500, detail="Failed to connect to Dodo Payments")
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")


@router.post("/webhook")
async def dodo_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """
    Handles Dodo Payments webhook events.
    Verifies the signature if configured.
    """
    payload = await request.body()
    signature = request.headers.get("Authorization") or request.headers.get("x-dodo-signature")

    # If Dodo Webhook Secret is configured, perform a basic auth check or HMAC check.
    if settings.DODO_WEBHOOK_SECRET:
        secret = settings.DODO_WEBHOOK_SECRET
        
        # Simple bearer token approach
        if signature == f"Bearer {secret}" or signature == secret:
            pass 
        else:
            # Fallback to standard HMAC SHA256 verification (if a signature exists)
            if signature:
                secret_bytes = secret.encode('utf-8')
                expected_sig = hmac.new(secret_bytes, payload, hashlib.sha256).hexdigest()
                
                if not hmac.compare_digest(expected_sig, signature) and signature != expected_sig:
                    print(f"Webhook HMAC mismatch:\nExpected: {expected_sig}\nGot: {signature}")
                    raise HTTPException(status_code=400, detail="Invalid webhook signature")

    data = await request.json()
    # Dodo uses "type" instead of "event" for the webhook action name
    event = data.get("type") or data.get("event")

    # Important Payload Note: Make sure to wrap it safely with get()
    if event in ["payment.succeeded", "payment.success", "subscription.active", "subscription.renewed"]:
        # Extract metadata custom field from Dodo's payload
        org_id = data.get("data", {}).get("metadata", {}).get("org_id")
        
        # If Dodo passes explicit period end date, use it; otherwise just add 30/365 days 
        # (For safety, we'll give 30 days generic if no exact date is found)
        from datetime import datetime, timedelta
        
        # Look for subscription current_period_end in data
        current_period_end_ts = data.get("data", {}).get("subscription", {}).get("current_period_end")
        
        if current_period_end_ts:
            if isinstance(current_period_end_ts, (int, float)):
                new_expiry = datetime.utcfromtimestamp(current_period_end_ts)
            else:
                try:
                    new_expiry = datetime.fromisoformat(current_period_end_ts.replace("Z", "+00:00"))
                except ValueError:
                    new_expiry = datetime.utcnow() + timedelta(days=30)
        else:
            new_expiry = datetime.utcnow() + timedelta(days=30)
            
        product_id = data.get("data", {}).get("product_id") or data.get("data", {}).get("subscription", {}).get("product_id")
        
        tickets_to_add = 0
        plan_name = "free"
        if product_id == settings.DODO_STARTER_PRODUCT_ID:
            tickets_to_add = 1000
            plan_name = "starter"
        elif product_id == settings.DODO_GROWTH_PRODUCT_ID:
            tickets_to_add = 5000
            plan_name = "growth"

        print(f"[SUCCESS] Parsed event={event}, updating Org={org_id} to Active till {new_expiry}. Refilling {tickets_to_add} tickets.")
            
        if org_id:
            await db.execute(
                update(Organisation)
                .where(Organisation.id == UUID(org_id))
                .values(
                    sub_status="active",
                    subscription_ends_at=new_expiry,
                    plan=plan_name,
                )
            )
            if tickets_to_add > 0:
                from models.ticket_batch import TicketBatch
                batch = TicketBatch(
                    org_id=UUID(org_id),
                    initial_tickets=tickets_to_add,
                    remaining_tickets=tickets_to_add,
                    expires_at=new_expiry
                )
                db.add(batch)
                
            await db.commit()

    elif event in ["subscription.cancelled", "payment.failed", "subscription.failed", "subscription.past_due"]:
        org_id = data.get("data", {}).get("metadata", {}).get("org_id")
        
        if org_id:
            print(f"[FAILED] Parsed event={event}, locking Org={org_id}")
            await db.execute(
                update(Organisation)
                .where(Organisation.id == UUID(org_id))
                .values(
                    sub_status="inactive"
                )
            )
            await db.commit()

    return {"status": "ok"}


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
            sub_status="active",
            plan="growth",
        )
    )
    
    from models.ticket_batch import TicketBatch
    from datetime import datetime, timedelta
    # 100 years expiry for lifetime referral promo
    batch = TicketBatch(
        org_id=current_user.org_id,
        initial_tickets=5000,
        remaining_tickets=5000,
        expires_at=datetime.utcnow() + timedelta(days=365*100)
    )
    db.add(batch)
    
    await db.commit()

    return {"message": "Referral applied successfully. Welcome to SupportOS!"}
