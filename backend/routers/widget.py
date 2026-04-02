import asyncio
import json
import uuid
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from core.database import get_db
from core.redis import get_redis
from models.organisation import Organisation
from schemas.ticket import TicketCreate
import services.ticket_service as ticket_service

router = APIRouter()

async def redis_listener(websocket: WebSocket, redis_client, channel_name: str):
    """Listens to a Redis pub/sub channel and forwards messages to the WebSocket."""
    pubsub = redis_client.pubsub()
    await pubsub.subscribe(channel_name)
    try:
        async for message in pubsub.listen():
            if message['type'] == 'message':
                data = message['data']
                # The data is already a JSON string from ticket_service
                await websocket.send_text(data)
    except asyncio.CancelledError:
        pass
    except Exception as e:
        print(f"Redis listener error: {e}")
    finally:
        await pubsub.unsubscribe(channel_name)
        await pubsub.close()

@router.websocket("/ws/{org_id}")
async def widget_websocket(
    websocket: WebSocket, 
    org_id: uuid.UUID, 
    session_id: str = Query(...),
    db: AsyncSession = Depends(get_db),
    redis = Depends(get_redis)
):
    await websocket.accept()

    # 1. Verify org exists
    result = await db.execute(select(Organisation).where(Organisation.id == org_id))
    org = result.scalars().first()
    if not org:
        await websocket.send_json({"type": "error", "message": "Invalid Organization ID."})
        await websocket.close()
        return

    # 2. Start listener for replies targeted at this customer widget
    channel_name = f"conv:{session_id}"
    listener_task = asyncio.create_task(redis_listener(websocket, redis, channel_name))

    try:
        while True:
            # Wait for user input from the chat widget
            data = await websocket.receive_json()
            
            body = data.get("body", "").strip()
            if not body:
                continue
                
            # 3. Find active ticket or create new one
            ticket = await ticket_service.get_ticket_by_session(db, org_id, session_id)
            if not ticket:
                ticket_data = TicketCreate(
                    channel="chat",
                    subject=body[:50] + "..." if len(body) > 50 else body,
                    requester_email="guest@example.com", # In real app, we might ask for email first
                    requester_name="Guest User",
                    session_id=session_id
                )
                ticket = await ticket_service.create_ticket(db, org_id, ticket_data)
                
            # 4. Save the user's message
            await ticket_service.add_message(
                db=db,
                redis_client=redis,
                ticket=ticket,
                sender_type="user",
                body=body,
                sender_id=session_id
            )
            
            # 5. Handle Bot (Phase 3 placeholder)
            if org.chatbot_enabled:
                # We will trigger the LangGraph bot in Phase 3
                await websocket.send_json({
                    "type": "waiting", 
                    "message": "AI Assistant processing..."
                })
            else:
                await websocket.send_json({
                    "type": "waiting", 
                    "message": "An agent will be with you shortly."
                })
                
    except WebSocketDisconnect:
        print(f"Customer {session_id} disconnected")
    except Exception as e:
        print(f"Error in widget WS: {e}")
    finally:
        listener_task.cancel()
