# -----------------------------------------------------------------------------
# agents/state.py - LangGraph State Schema
# -----------------------------------------------------------------------------
#
# WHAT IS THIS?
#   The "state" is a dictionary that flows through every node in the graph.
#   Think of it like a clipboard being passed between workers on an assembly line:
#     - Worker 1 (retriever) writes: "I found these 5 relevant chunks"
#     - Worker 2 (escalation) checks: "Should I route to a human?"
#     - Worker 3 (responder) reads the chunks and writes: "Here's the answer"
#
#   TypedDict enforces the shape so we don't accidentally lose data between nodes.
# -----------------------------------------------------------------------------

from typing import TypedDict, Optional


class SupportState(TypedDict):
    # ── Identity ──────────────────────────────────────────
    conversation_id: str         # Unique session identifier (maps to widget session)
    org_id: str                  # Which org's knowledge base to search

    # ── Conversation ──────────────────────────────────────
    query: str                   # The customer's latest question (plain text)
    retrieved_chunks: list[str]  # Text chunks from Qdrant that match the query
    response: str                # The bot's generated answer

    # ── Confidence & Escalation ───────────────────────────
    confidence: float            # How relevant the retrieved chunks are (0.0 – 1.0)
    needs_escalation: bool       # True if the bot can't answer - route to human agent

    # ── Tracking ──────────────────────────────────────────
    ticket_id: Optional[str]     # Postgres ticket ID (for saving bot messages)
    bot_failure_count: int       # How many consecutive "I don't know" responses
