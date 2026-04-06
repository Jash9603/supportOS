# -----------------------------------------------------------------------------
# routers/widget.py — The Chat Widget API
# -----------------------------------------------------------------------------
#
# WHY IT WAS CREATED?
#   Imagine a physical storefront. The "Chat Widget" is the friendly greeter
#   at the door. This file powers the little chat bubble that a customer sees
#   on the bottom right of the company's public website.
#
# WHAT DOES IT DO?
#   It handles the real-time, two-way communication between the customer's
#   browser and our backend server using a technology called "WebSockets."
#   Unlike a regular web page that you have to refresh to see new messages,
#   WebSockets keep a pipe open so messages can zip back and forth instantly.
# -----------------------------------------------------------------------------

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

# -----------------------------------------------------------------------------
# FUNCTION: redis_listener
# -----------------------------------------------------------------------------
# WHAT IT DOES: 
#   Think of this as an invisible mail carrier assigned to just ONE customer.
#   While the customer is chatting with the AI bot or a human agent, the agent 
#   might type a reply. The agent's reply gets published to a central bulletin 
#   board (Redis). This function stares at that board, grabs the reply as soon 
#   as it's posted, and shoots it down the pipe (WebSocket) to the customer's screen.
async def redis_listener(websocket: WebSocket, redis_client, channel_name: str):
    """Listens to a Redis pub/sub channel and forwards messages to the WebSocket."""
    pubsub = redis_client.pubsub()
    await pubsub.subscribe(channel_name)
    try:
        async for message in pubsub.listen():
            if message['type'] == 'message':
                data = message['data']
                # The data is already a JSON string from ticket_service, send it directly to the user
                await websocket.send_text(data)
    except asyncio.CancelledError:
        pass  # It's totally fine if this gets cancelled when the customer closes the tab
    except Exception as e:
        print(f"Redis listener error: {e}")
    finally:
        await pubsub.unsubscribe(channel_name)
        await pubsub.close()

# -----------------------------------------------------------------------------
# FUNCTION: load_or_init_state
# -----------------------------------------------------------------------------
# WHAT IT DOES:
#   The AI Chatbot has the memory of a goldfish. If it answers a question, it
#   immediately forgets what just happened. To fix this, we store the "state" 
#   (how many times it failed to answer, what ticket we are on, etc.) in a 
#   temporary fast memory bank called Redis. This function either fetches the 
#   saved memory, or creates a blank new memory if the customer just arrived.
async def load_or_init_state(redis, session_id: str, org_id: uuid.UUID, ticket_id: uuid.UUID):
    state_str = await redis.get(f"langgraph_state:{session_id}")
    if state_str:
        return json.loads(state_str)
    return {
        "conversation_id": session_id,
        "org_id": str(org_id),
        "query": "",
        "retrieved_chunks": [],
        "response": "",
        "confidence": 0.0,
        "needs_escalation": False, # Has the bot given up and asked for a human?
        "ticket_id": str(ticket_id),
        "bot_failure_count": 0,    # How many times has the bot said "I don't know"?
    }

# -----------------------------------------------------------------------------
# FUNCTION: save_state
# -----------------------------------------------------------------------------
# WHAT IT DOES:
#   Takes the AI's current memory "state" and saves it back into the Redis memory 
#   bank so it can be remembered for the next time the customer types a message.
async def save_state(redis, session_id: str, state: dict):
    # 'ex=86400' means the memory expires and deletes itself after 24 hours
    await redis.set(f"langgraph_state:{session_id}", json.dumps(state), ex=86400)


# -----------------------------------------------------------------------------
# FUNCTION: widget_websocket (The Main Event)
# -----------------------------------------------------------------------------
# WHAT IT DOES:
#   This is the main function that runs the entire time a customer is on the site.
#   It accepts the connection, listens to every word the customer types, decides 
#   whether the AI Bot or a Human should reply, and sends the answer back.
@router.websocket("/ws/{org_id}")
async def widget_websocket(
    websocket: WebSocket, 
    org_id: uuid.UUID, 
    session_id: str = Query(...),
    db: AsyncSession = Depends(get_db),
    redis = Depends(get_redis)
):
    from schemas.ticket import TicketUpdate

    # Accept the open pipe connection from the customer's browser
    await websocket.accept()

    # 1. Check if the company (organization) actually exists in our system.
    # If a hacker tries to guess an ID, we kick them out.
    result = await db.execute(select(Organisation).where(Organisation.id == org_id))
    org = result.scalars().first()
    if not org:
        await websocket.send_json({"type": "error", "message": "Invalid Organization ID."})
        await websocket.close()
        return

    # 2. Assign the "invisible mail carrier" (Redis listener) to watch for 
    # incoming replies from Human Agents or the system.
    channel_name = f"conv:{session_id}"
    listener_task = asyncio.create_task(redis_listener(websocket, redis, channel_name))

    try:
        # A forever-loop that just waits for the customer to say something
        while True:
            # Wait until the customer hits "Send"
            data = await websocket.receive_json()
            
            body = data.get("body", "").strip()
            if not body:
                continue
                
            # 3. Before doing anything, we need a "Ticket" (a file folder for this chat).
            # If they already have an active folder, grab it. Otherwise, create a new one.
            ticket = await ticket_service.get_ticket_by_session(db, org_id, session_id)
            if not ticket:
                ticket_data = TicketCreate(
                    channel="chat",
                    subject=body[:50] + "..." if len(body) > 50 else body, # Make the subject the first 50 chars
                    requester_email="guest@example.com", 
                    requester_name="Guest User",
                    session_id=session_id
                )
                ticket = await ticket_service.create_ticket(db, org_id, ticket_data)
                
            # 4. Save the customer's message into the database permanently.
            await ticket_service.add_message(
                db=db,
                redis_client=redis,
                ticket=ticket,
                sender_type="user",
                body=body,
                sender_id=session_id
            )
            
            # 5. Handle The AI Bot!
            # If the company turned the bot ON, AND the chat hasn't been transferred 
            # to a human agent yet (needs_human is false):
            if org.chatbot_enabled and not ticket.needs_human:
                
                # Send a quick event to show a typing indicator "AI Assistant thinking..."
                await websocket.send_json({
                    "type": "waiting", 
                    "message": "AI Assistant thinking..."
                })
                
                from agents.graphs.support_agent import support_graph
                
                # Load the "goldfish memory" for the AI
                state = await load_or_init_state(redis, session_id, org_id, ticket.id)
                state["query"] = body              # Hand it the customer's question
                state["needs_escalation"] = False  # Reset emergency escape hatch
                
                full_reply = []
                final_state = state.copy()
                
                # We ask the AI graph to start generating the answer.
                # Instead of waiting 5 seconds for the whole paragraph to finish, 
                # we "stream" it letter-by-letter (tokens) so it feels super fast to the user!
                async for event in support_graph.astream_events(state, version="v2"):
                    if event["event"] == "on_chat_model_stream":
                        token = event["data"]["chunk"].content # Grab the next word 
                        if token:
                            full_reply.append(token)
                            # Shoot the word immediately down the pipe to the customer's screen
                            await websocket.send_text(json.dumps({"type": "token", "content": token}))
                    elif event["event"] == "on_chain_end" and event["name"] == "LangGraph":
                        final_state = event["data"]["output"] # Save the final goldfish memory

                # Process outcome: Let's see how the AI did.
                if final_state.get("needs_escalation"):
                    # The AI panicked and triggered an escalation (either the user said "Talk to human" or the bot didn't know the answer)
                    await websocket.send_text(json.dumps({
                        "type": "escalated",
                        "message": "I'm connecting you with our support team now."
                    }))
                    
                    # Flip the switch! Mark this ticket as needing a real human.
                    ticket = await ticket_service.update_ticket(db, ticket.id, TicketUpdate(needs_human=True))
                    
                    # Ring the bell in the Admin's inbox to notify them that a human is needed!
                    await ticket_service.publish_event(redis, f"tickets:{org_id}", "ticket_updated", {"ticket_id": str(ticket.id)})
                else:
                    # The AI answered successfully. Save the full reply in the DB permanently.
                    bot_reply = "".join(full_reply)
                    await ticket_service.add_message(db, redis, ticket, "bot", bot_reply, session_id, skip_ws_publish=True)
                
                # Save the new memory for next time
                await save_state(redis, session_id, final_state)

            else:
                # If the bot is completely disabled, OR the ticket was already escalated 
                # to a human, we just politely tell the customer to wait.
                await websocket.send_json({
                    "type": "waiting", 
                    "message": "An agent will be with you shortly."
                })
                
    except WebSocketDisconnect:
        # Expected: The customer closed their browser tab.
        print(f"Customer {session_id} disconnected")
    except Exception as e:
        # Unexpected: Something broke
        print(f"Error in widget WS: {e}")
    finally:
        # No matter what happens, kill the invisible mail carrier so it doesn't drain memory!
        listener_task.cancel()
