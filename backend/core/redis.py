# -----------------------------------------------------------------------------
# redis.py - Redis Client (Cache / Real-time Messaging)
# -----------------------------------------------------------------------------
# This file creates and manages the connection to our Redis Cloud instance.
# Redis is used for two things in SupportOS:
#
#   1. PUB/SUB MESSAGING - when an agent replies to a ticket, the message is
#      published to a Redis channel. The customer's WebSocket connection is
#      subscribed to that channel and receives the reply in real time.
#
#   2. CELERY TASK QUEUE - Celery uses Redis as the broker to queue background
#      jobs (like document ingestion for the AI knowledge base).
#
# The client is a singleton - created once and reused across all requests.
# -----------------------------------------------------------------------------

import redis.asyncio as aioredis

from core.config import settings

# Singleton async Redis client - shared across requests
_redis_client: aioredis.Redis | None = None


async def get_redis() -> aioredis.Redis:
    """
    Returns the shared async Redis client.
    Call this in FastAPI route dependencies or WebSocket handlers.
    Connects lazily on first call.
    """
    global _redis_client
    if _redis_client is None:
        _redis_client = aioredis.from_url(
            settings.REDIS_URL,
            decode_responses=True,  # all keys/values returned as str, not bytes
        )
    return _redis_client


async def close_redis() -> None:
    """Call on app shutdown to cleanly close the connection pool."""
    global _redis_client
    if _redis_client is not None:
        await _redis_client.aclose()
        _redis_client = None
