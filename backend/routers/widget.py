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
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

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
    user_id: str = Query("default"),
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

    # 1.5 Security: Check if the widget is embedded on an allowed domain
    origin = websocket.headers.get("origin")
    if origin and org.allowed_domains and len(org.allowed_domains) > 0:
        import urllib.parse
        parsed = urllib.parse.urlparse(origin)
        domain = parsed.netloc if parsed.netloc else parsed.path
        if not any(d.lower() in domain.lower() for d in org.allowed_domains):
            await websocket.send_json({"type": "error", "message": f"Unauthorized domain: {domain}"})
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
            # SECURITY: truncate massive texts to prevent token abuse
            body = body[:1000] 
            
            if not body:
                continue
                
            # 3. Before doing anything, we need a "Ticket" (a file folder for this chat).
            # If they already have an active folder, grab it. Otherwise, create a new one.
            ticket = await ticket_service.get_ticket_by_session(db, org_id, session_id)
            if not ticket:
                # Calculate ticket number (e.g. "Ticket 5")
                from sqlalchemy import func
                from models.ticket import Ticket
                count_res = await db.execute(select(func.count()).where(Ticket.org_id == org_id))
                ticket_number = count_res.scalar() + 1
                
                # Determine subject based on user_id
                if user_id and user_id != "default":
                    subject = f"User: {user_id}"
                else:
                    subject = f"Ticket {ticket_number}"

                ticket_data = TicketCreate(
                    channel="chat",
                    subject=subject,
                    requester_email="guest@example.com", 
                    requester_name=f"User {user_id}" if user_id and user_id != "default" else "Guest User",
                    session_id=session_id
                )
                ticket = await ticket_service.create_ticket(db, org_id, ticket_data)
                # 🔔 Notify dashboard: new ticket created
                await ticket_service.create_notification(
                    db, redis, org_id=org_id,
                    notif_type="new_ticket",
                    title=f"New ticket from {ticket_data.requester_name}",
                    body=subject,
                    ticket_id=ticket.id,
                )
            
            elif ticket.status == "resolved":
                # Customer messaged again on a resolved ticket — re-open it!
                # Reset: let AI handle fresh, clear assignment, preserve message history
                ticket.status = "open"
                ticket.needs_human = False
                ticket.assigned_to = None
                await db.commit()
                await db.refresh(ticket)
                # Clear the AI's old memory so it starts fresh
                await redis.delete(f"langgraph_state:{session_id}")
                # Notify the admin dashboard
                await ticket_service.publish_event(redis, f"tickets:{org_id}", "ticket_updated", {"ticket_id": str(ticket.id)})
                
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
                resolve_buffer = ""  # Buffer to catch and suppress [RESOLVED] tag
                async for event in support_graph.astream_events(state, version="v2"):
                    if event["event"] == "on_chat_model_stream":
                        token = event["data"]["chunk"].content # Grab the next word 
                        if token:
                            full_reply.append(token)
                            
                            # Buffer tokens to detect and suppress [RESOLVED] tag
                            resolve_buffer += token
                            if "[RESOLVED]" in resolve_buffer:
                                # Strip the tag and flush the clean part
                                clean = resolve_buffer.replace("[RESOLVED]", "")
                                if clean:
                                    await websocket.send_text(json.dumps({"type": "token", "content": clean}))
                                resolve_buffer = ""
                            elif any("[RESOLVED]".startswith(resolve_buffer[-i:]) for i in range(1, len(resolve_buffer) + 1) if resolve_buffer[-i:] == "[RESOLVED]"[:i]):
                                # Partial match — keep buffering
                                pass
                            else:
                                # No match possible — flush and send
                                await websocket.send_text(json.dumps({"type": "token", "content": resolve_buffer}))
                                resolve_buffer = ""
                    elif event["event"] == "on_chain_end" and event["name"] == "LangGraph":
                        final_state = event["data"]["output"] # Save the final goldfish memory

                # Flush any remaining buffer (strip [RESOLVED] if partially captured)
                if resolve_buffer:
                    leftover = resolve_buffer.replace("[RESOLVED]", "").strip()
                    if leftover:
                        await websocket.send_text(json.dumps({"type": "token", "content": leftover}))

                # Process outcome: Let's see how the AI did.
                if final_state.get("needs_escalation"):
                    escalated_msg = "I'm connecting you with our support team now. Please be patient as the agent may take a moment to respond."
                    
                    # The AI panicked and triggered an escalation
                    await websocket.send_text(json.dumps({
                        "type": "message",
                        "body": escalated_msg,
                        "sender_type": "bot"
                    }))
                    
                    # Flip the switch! Mark this ticket as needing a real human.
                    # We also auto-assign it to the organisation's owner so it appears in "Assigned to me"
                    from models.user import User
                    owner_res = await db.execute(select(User).where(User.org_id == org_id, User.role == "owner").limit(1))
                    owner = owner_res.scalars().first()
                    
                    update_data = TicketUpdate(needs_human=True)
                    if owner:
                        update_data.assigned_to = owner.id
                        
                    ticket = await ticket_service.update_ticket(db, ticket.id, update_data)
                    
                    # Ring the bell in the Admin's inbox to notify them that a human is needed!
                    await ticket_service.publish_event(redis, f"tickets:{org_id}", "ticket_updated", {"ticket_id": str(ticket.id)})
                    
                    # 🔔 Notify dashboard: escalation alert
                    await ticket_service.create_notification(
                        db, redis, org_id=org_id,
                        notif_type="escalation",
                        title=f"⚠️ Escalation: {ticket.subject[:60]}",
                        body=f"{ticket.requester_name} needs human help",
                        ticket_id=ticket.id,
                    )
                    
                    # Save the message permanently so it's visible on refresh and to the human agent
                    await ticket_service.add_message(db, redis, ticket, "bot", escalated_msg, session_id, skip_ws_publish=True)
                else:
                    # The AI answered successfully. Save the full reply in the DB permanently.
                    bot_reply = final_state.get("response", "".join(full_reply))
                    
                    # Check if the AI detected customer satisfaction and tagged [RESOLVED]
                    from agents.prompts import RESOLVE_INDICATOR
                    should_resolve = RESOLVE_INDICATOR in bot_reply
                    
                    # Strip the hidden tag so the customer never sees it
                    clean_reply = bot_reply.replace(RESOLVE_INDICATOR, "").strip()
                    
                    await ticket_service.add_message(db, redis, ticket, "bot", clean_reply, session_id, skip_ws_publish=True)
                    
                    # If the AI determined the customer is satisfied, auto-resolve the ticket
                    if should_resolve:
                        ticket.status = "resolved"
                        # needs_human stays False → counts as "Resolved by AI" in analytics
                        await db.commit()
                        await db.refresh(ticket)
                        await ticket_service.publish_event(redis, f"tickets:{org_id}", "ticket_updated", {"ticket_id": str(ticket.id)})
                
                # Save the new memory for next time
                await save_state(redis, session_id, final_state)

            # If the bot is disabled or the ticket is escalated, we just skip the AI part.
            # The customer's message was already saved to DB on line 166, so it's safely logged!
            pass
                
    except WebSocketDisconnect:
        # Expected: The customer closed their browser tab.
        print(f"Customer {session_id} disconnected")
    except Exception as e:
        # Unexpected: Something broke
        print(f"Error in widget WS: {e}")
    finally:
        # No matter what happens, kill the invisible mail carrier so it doesn't drain memory!
        listener_task.cancel()


@router.get("/widget/{org_id}/history")
async def get_chat_history(
    org_id: uuid.UUID,
    session_id: str = Query(...),
    db: AsyncSession = Depends(get_db)
):
    """
    Fetches the chat history for a given widget session so the customer
    can see their previous messages if they refresh the page.
    """
    from models.ticket import Ticket
    from models.message import Message
    
    # 1. Find the ticket for this session
    res = await db.execute(select(Ticket).where(Ticket.org_id == org_id, Ticket.session_id == session_id).limit(1))
    ticket = res.scalars().first()
    
    if not ticket:
        return []
        
    # 2. Grab all messages
    msg_res = await db.execute(
        select(Message)
        .where(Message.ticket_id == ticket.id)
        .order_by(Message.created_at.asc())
    )
    messages = msg_res.scalars().all()
    
    # 3. Format for the frontend WidgetChat
    return [
        {
            "id": str(msg.id),
            "body": msg.body,
            "sender": msg.sender_type,
            "time": msg.created_at.strftime("%I:%M %p")
        }
        for msg in messages
    ]

