# -----------------------------------------------------------------------------
# agents/graphs/support_agent.py — LangGraph RAG Support Agent
# -----------------------------------------------------------------------------
#
# WHAT IS THIS?
#   The AI brain of SupportOS. A LangGraph state machine with 3 nodes:
#
#   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
#   │  RETRIEVER  │────▶│  ESCALATION │──?──▶│  RESPONDER  │
#   │             │     │   CHECK     │     │             │
#   │ Search KB   │     │ Should we   │     │ GPT-4o-mini │
#   │ in Qdrant   │     │ hand off to │     │ generates   │
#   │             │     │ a human?    │     │ the answer  │
#   └─────────────┘     └──────┬──────┘     └─────────────┘
#                              │ YES
#                              ▼
#                         ┌─────────┐
#                         │   END   │
#                         │ (escalated=True)
#                         └─────────┘
#
# HOW IT WORKS (layman terms):
#   1. Customer asks: "What is your refund policy?"
#   2. RETRIEVER: searches the org's uploaded docs for relevant chunks
#   3. ESCALATION CHECK: Did we find good results? Did the customer ask for a human?
#      - If yes → skip the bot, route to human agent immediately
#      - If no  → continue to RESPONDER
#   4. RESPONDER: feeds the chunks + question to GPT-4o-mini, generates an answer
#   5. The answer flows back to the WebSocket → customer sees it in the widget
#
# LANGSMITH TRACING:
#   Every node execution, LLM call, and state transition is automatically
#   traced because we set LANGCHAIN_TRACING_V2=true in agents/__init__.py.
#   View traces at: https://smith.langchain.com → project "supportos-prod"
# -----------------------------------------------------------------------------

from langgraph.graph import StateGraph, END
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage

from agents.state import SupportState
from agents.prompts import (
    SUPPORT_SYSTEM_PROMPT,
    FALLBACK_INDICATOR,
    ESCALATION_KEYWORDS,
)
from services.rag_service import search_knowledge_base
from core.config import settings


# ── Node 1: RETRIEVER ─────────────────────────────────────────────────────────
# Searches the org's Qdrant knowledge base for relevant text chunks.
# Sets confidence based on the top result's similarity score.

def retriever_node(state: SupportState) -> dict:
    """
    Search the knowledge base for chunks relevant to the customer's question.

    Input:  state with 'org_id' and 'query'
    Output: updates 'retrieved_chunks' and 'confidence'
    """
    results = search_knowledge_base(
        org_id=state["org_id"],
        query=state["query"],
        top_k=5,
    )

    if not results:
        # No documents uploaded yet, or collection doesn't exist
        return {
            "retrieved_chunks": [],
            "confidence": 0.0,
        }

    return {
        "retrieved_chunks": [r["text"] for r in results],
        "confidence": results[0]["score"],  # Top result's cosine similarity
    }


# ── Node 2: ESCALATION CHECK ─────────────────────────────────────────────────
# Decides whether to skip the bot and route directly to a human agent.
# Three triggers:
#   1. Customer explicitly asked for a human ("talk to someone")
#   2. No relevant knowledge base results (confidence too low)
#   3. Bot has failed to answer 2+ times in a row

def escalation_check_node(state: SupportState) -> dict:
    """
    Check if we should escalate to a human agent instead of using the bot.

    Input:  state with 'query', 'confidence', 'bot_failure_count'
    Output: updates 'needs_escalation' and optionally 'response'
    """
    query_lower = state["query"].lower()

    # Trigger 1: Customer asked for a human
    if any(keyword in query_lower for keyword in ESCALATION_KEYWORDS):
        return {
            "needs_escalation": True,
            "response": "I'm connecting you with our support team now. A human agent will be with you shortly.",
        }

    # Trigger 2: Knowledge base has no good results (confidence < 0.3)
    # AND the bot has already failed once before
    if state["confidence"] < 0.3 and state["bot_failure_count"] >= 1:
        return {
            "needs_escalation": True,
            "response": "I don't seem to have the right information for your question. Let me connect you with our support team.",
        }

    # Trigger 3: Bot has failed 2+ consecutive times
    if state["bot_failure_count"] >= 2:
        return {
            "needs_escalation": True,
            "response": "I'm having trouble finding the right answer. Let me connect you with a human agent who can help.",
        }

    # No escalation needed — let the bot try to answer
    return {"needs_escalation": False}


# ── Node 3: RESPONDER ─────────────────────────────────────────────────────────
# Calls GPT-4o-mini with the retrieved context to generate an answer.
# Detects if the bot gave a "I don't know" fallback and increments failure count.

async def responder_node(state: SupportState) -> dict:
    """
    Generate an AI response using the retrieved knowledge base chunks.

    Input:  state with 'query', 'retrieved_chunks'
    Output: updates 'response' and 'bot_failure_count'
    """
    # Build context from retrieved chunks
    if state["retrieved_chunks"]:
        context = "\n---\n".join(state["retrieved_chunks"])
    else:
        context = "(No relevant documents found in the knowledge base.)"

    # Build the prompt
    system_prompt = SUPPORT_SYSTEM_PROMPT.format(context=context)

    # Call GPT-4o-mini
    llm = ChatOpenAI(
        model="gpt-4o-mini",
        api_key=settings.OPENAI_API_KEY,
        temperature=0.3,       # Low temperature = more factual, less creative
        max_tokens=500,
        streaming=True,        # CRITICAL for real-time WebSocket bubbling
    )

    result = await llm.ainvoke([
        SystemMessage(content=system_prompt),
        HumanMessage(content=state["query"]),
    ])

    answer = result.content

    # Detect fallback — if the bot said "I don't know", escalate immediately
    if FALLBACK_INDICATOR.lower() in answer.lower():
        return {
            "response": answer,
            "bot_failure_count": state["bot_failure_count"] + 1,
            "needs_escalation": True,  # Auto-escalate on first failure
        }

    # Success — reset failure counter
    return {
        "response": answer,
        "bot_failure_count": 0,
    }


# ── Conditional Edge: should we escalate or let the bot respond? ──────────────

def should_escalate(state: SupportState) -> str:
    """Route to END (escalated) or to responder (bot answers)."""
    if state.get("needs_escalation"):
        return "end"
    return "responder"


# ── Build the Graph ───────────────────────────────────────────────────────────

def build_support_graph():
    """
    Compile the LangGraph state machine.

    Flow:
      START → retriever → escalation_check →  (if escalate) → END
                                            →  (else) → responder → END
    """
    graph = StateGraph(SupportState)

    # Add nodes
    graph.add_node("retriever", retriever_node)
    graph.add_node("escalation_check", escalation_check_node)
    graph.add_node("responder", responder_node)

    # Set entry point
    graph.set_entry_point("retriever")

    # Edges
    graph.add_edge("retriever", "escalation_check")

    # Conditional: escalate or let bot respond
    graph.add_conditional_edges(
        "escalation_check",
        should_escalate,
        {
            "end": END,          # Escalated → stop here
            "responder": "responder",  # Bot answers
        }
    )

    graph.add_edge("responder", END)

    return graph.compile()


# ── Pre-compiled graph instance ───────────────────────────────────────────────
# Import this directly: from agents.graphs.support_agent import support_graph
support_graph = build_support_graph()
