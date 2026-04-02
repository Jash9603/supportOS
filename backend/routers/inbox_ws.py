import asyncio
import uuid
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from fastapi import Cookie

from core.database import get_db
from core.redis import get_redis
from core.security import decode_token

router = APIRouter()

async def get_ws_current_user(websocket: WebSocket):
    """Dependency to extract user identity from cookie in WebSocket"""
    token = websocket.cookies.get("access_token")
    if not token:
        await websocket.close(code=1008, reason="Missing token")
        return None
    try:
        payload = decode_token(token)
        return payload
    except Exception:
        await websocket.close(code=1008, reason="Invalid token")
        return None

async def redis_inbox_listener(websocket: WebSocket, redis_client, org_id: str):
    """Listens to a Redis org channel and forwards events to the inbox UI."""
    channel_name = f"tickets:{org_id}"
    pubsub = redis_client.pubsub()
    await pubsub.subscribe(channel_name)
    try:
        async for message in pubsub.listen():
            if message['type'] == 'message':
                data = message['data']
                await websocket.send_text(data)
    except asyncio.CancelledError:
        pass
    except Exception as e:
        print(f"Redis inbox listener error: {e}")
    finally:
        await pubsub.unsubscribe(channel_name)
        await pubsub.close()

@router.websocket("/inbox-ws/{org_id}")
async def inbox_websocket(
    websocket: WebSocket, 
    org_id: uuid.UUID,
    redis = Depends(get_redis)
):
    await websocket.accept()
    
    user_payload = await get_ws_current_user(websocket)
    if not user_payload:
        return
        
    # Ensure they only subscribe to their own organisation's traffic
    if str(org_id) != user_payload.get("org_id"):
        await websocket.close(code=1008, reason="Unauthorized org scope")
        return
        
    listener_task = asyncio.create_task(redis_inbox_listener(websocket, redis, str(org_id)))

    try:
        # Keep connection open. Dashboard doesn't send messages over WS (uses REST API for that), 
        # so we just idle and listen.
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        print(f"Agent {user_payload.get('id')} disconnected from inbox WS")
    finally:
        listener_task.cancel()
