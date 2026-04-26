import asyncio
from sqlalchemy.future import select
from core.database import AsyncSessionLocal
from models.notification import Notification

async def check_notifications():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Notification).order_by(Notification.created_at.desc()))
        notifs = result.scalars().all()
        print(f"Found {len(notifs)} notifications:")
        for n in notifs:
            print(f"- [{n.type}] {n.title} (Read: {n.is_read})")

if __name__ == "__main__":
    asyncio.run(check_notifications())
