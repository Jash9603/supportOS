# -----------------------------------------------------------------------------
# services/auth_service.py - Auth Business Logic
# -----------------------------------------------------------------------------
# This file handles all the database work for authentication.
# The router (auth.py) calls these functions - keeping routes thin and logic here.
#
# Functions:
#   get_user_by_email()     → look up a user by email address
#   create_org_and_user()   → sign up: create org + first user in one transaction
#   generate_unique_slug()  → turn "Acme Corp" into "acme-corp" (unique in DB)
# -----------------------------------------------------------------------------

import re
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.organisation import Organisation
from models.user import User
from core.security import hash_password


async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
    """
    Look up a user by their email address.
    Returns the User object if found, None if not found.
    """
    result = await db.execute(select(User).where(User.email == email.lower()))
    return result.scalar_one_or_none()


async def get_user_by_id(db: AsyncSession, user_id: uuid.UUID) -> User | None:
    """Look up a user by their UUID - used by the /me endpoint via the cookie token."""
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def get_org_by_id(db: AsyncSession, org_id: uuid.UUID) -> Organisation | None:
    """Look up an organisation by its UUID."""
    result = await db.execute(select(Organisation).where(Organisation.id == org_id))
    return result.scalar_one_or_none()


def _slugify(text: str) -> str:
    """
    Convert a human name into a URL-safe slug.
    "Acme Corp" → "acme-corp"
    "My Cool Startup!" → "my-cool-startup"
    """
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)       # remove special chars except hyphen
    text = re.sub(r"[\s_]+", "-", text)         # spaces/underscores → hyphen
    text = re.sub(r"-+", "-", text)             # collapse multiple hyphens
    return text[:80]                             # max 80 chars


async def generate_unique_slug(db: AsyncSession, org_name: str) -> str:
    """
    Generate a unique slug for a new org.
    If "acme-corp" is taken, tries "acme-corp-1", "acme-corp-2", etc.
    """
    base_slug = _slugify(org_name)
    slug = base_slug
    counter = 1

    while True:
        # Check if this slug already exists in the DB
        result = await db.execute(
            select(Organisation).where(Organisation.slug == slug)
        )
        if result.scalar_one_or_none() is None:
            return slug  # slug is free!
        # Slug is taken → try adding a number suffix
        slug = f"{base_slug}-{counter}"
        counter += 1


async def create_org_and_user(
    db: AsyncSession,
    name: str,
    email: str,
    password: str,
    org_name: str,
) -> tuple[Organisation, User]:
    """
    Sign up flow - creates organisation + owner user in a single DB transaction.

    Steps:
      1. Generate unique slug from org_name
      2. Create Organisation record
      3. Create User record (role="owner") with hashed password
      4. Commit both together (if either fails, both are rolled back)

    Returns (org, user) - both freshly created.
    """
    slug = await generate_unique_slug(db, org_name)

    org = Organisation(
        name=org_name.strip(),
        slug=slug,
        plan="free",
        sub_status="inactive", # Lock out immediately
        chatbot_enabled=False,
        chatbot_config={},
        onboarding_completed=False,
    )
    db.add(org)
    await db.flush()  # assigns org.id without committing yet

    user = User(
        org_id=org.id,
        email=email.lower().strip(),
        name=name.strip(),
        hashed_password=hash_password(password),
        role="owner",
    )
    db.add(user)
    
    from models.ticket_batch import TicketBatch
    batch = TicketBatch(
        org_id=org.id,
        initial_tickets=100,
        remaining_tickets=100,
        expires_at=None # Lifetime free tier
    )
    db.add(batch)
    
    await db.commit()

    # Refresh so all server-default fields (created_at, etc.) are populated
    await db.refresh(org)
    await db.refresh(user)

    return org, user
