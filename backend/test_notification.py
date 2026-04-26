import asyncio
import json
import uuid
import websockets

async def send_customer_message(org_id, session_id):
    uri = f"ws://localhost:8000/ws/{org_id}?session_id={session_id}&user_id=test_user"
    async with websockets.connect(uri) as websocket:
        # Send a message
        msg = {
            "body": "Hello, I need some help with my account."
        }
        await websocket.send(json.dumps(msg))
        print("Message sent.")
        
        # Wait a moment to receive the bot's response or typing indicator
        try:
            response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
            print(f"Received: {response}")
        except asyncio.TimeoutError:
            print("No response from bot within timeout.")

if __name__ == "__main__":
    # Get the org ID (we can fetch it from DB, or just use the one we know: f79cfb91-381b-453b-876d-eac972c9286a)
    org_id = "f79cfb91-381b-453b-876d-eac972c9286a"
    session_id = str(uuid.uuid4())
    asyncio.run(send_customer_message(org_id, session_id))
