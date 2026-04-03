# -----------------------------------------------------------------------------
# services/rag_service.py — Retrieval-Augmented Generation Service
# -----------------------------------------------------------------------------
#
# WHAT IS THIS?
#   This service talks to Qdrant (our vector database) and OpenAI embeddings.
#   It has two jobs:
#     1. SEARCH: Take a customer's question, turn it into a math vector,
#        and find the most similar text chunks from the org's knowledge base.
#     2. DELETE: Remove all vectors for a specific document (when the founder
#        deletes a doc from the Chatbot dashboard).
#
# HOW SEARCH WORKS (in layman terms):
#   Imagine every sentence in your PDF is a point on a giant map.
#   When a customer asks "What is your refund policy?", we convert that
#   question into a point on the SAME map. Then we find the 5 closest
#   PDF sentences — those are the most relevant context for the AI to answer.
#
# WHY A SEPARATE SERVICE?
#   The LangGraph agent (agents/graphs/support_agent.py) calls this service
#   in its "retriever" node. The chatbot router also calls it for the
#   "test preview" feature. Keeping it separate = reusable + testable.
# -----------------------------------------------------------------------------

import uuid
from openai import OpenAI
from qdrant_client import QdrantClient
from qdrant_client.models import (
    VectorParams, Distance, PointStruct,
    Filter, FieldCondition, MatchValue,
    ScoredPoint,
)
from core.config import settings


def _get_qdrant_client() -> QdrantClient:
    """Create a Qdrant client connected to the configured cloud/local instance."""
    return QdrantClient(
        url=settings.QDRANT_URL.strip(),
        api_key=settings.QDRANT_API_KEY or None,
    )


def _collection_name(org_id: str) -> str:
    """Each org gets its own Qdrant collection — data is never shared."""
    return f"org_{org_id}_kb"


def embed_query(query: str) -> list[float]:
    """
    Convert a text string into a 1536-dimensional vector using OpenAI.
    This is the same model used during document ingestion, so the vectors
    are comparable (same embedding space).
    """
    client = OpenAI(api_key=settings.OPENAI_API_KEY)
    response = client.embeddings.create(
        model="text-embedding-3-small",
        input=[query]
    )
    return response.data[0].embedding


def search_knowledge_base(org_id: str, query: str, top_k: int = 5) -> list[dict]:
    """
    Semantic search: find the top-k most relevant text chunks for a query.

    Args:
        org_id: The org whose knowledge base to search.
        query:  The customer's question (plain text).
        top_k:  How many chunks to return (default 5).

    Returns:
        List of dicts: [{"text": "...", "score": 0.87, "doc_id": "..."}, ...]
        Empty list if the collection doesn't exist or has no matches.
    """
    qdrant = _get_qdrant_client()
    collection = _collection_name(org_id)

    # If collection doesn't exist yet (no docs uploaded), return empty
    if not qdrant.collection_exists(collection):
        return []

    # Embed the question into the same vector space as the documents
    query_vector = embed_query(query)

    # Search for the closest vectors
    results: list[ScoredPoint] = qdrant.search(
        collection_name=collection,
        query_vector=query_vector,
        limit=top_k,
    )

    return [
        {
            "text": r.payload.get("text", ""),
            "score": r.score,
            "doc_id": r.payload.get("doc_id", ""),
            "chunk_index": r.payload.get("chunk_index", 0),
        }
        for r in results
    ]


def delete_doc_vectors(org_id: str, doc_id: str) -> None:
    """
    Remove all vector points belonging to a specific document.
    Called when the founder deletes a doc from the Chatbot dashboard.
    """
    qdrant = _get_qdrant_client()
    collection = _collection_name(org_id)

    if not qdrant.collection_exists(collection):
        return

    qdrant.delete(
        collection_name=collection,
        points_selector=Filter(
            must=[
                FieldCondition(
                    key="doc_id",
                    match=MatchValue(value=doc_id),
                )
            ]
        ),
    )
