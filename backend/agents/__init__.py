# -----------------------------------------------------------------------------
# agents/__init__.py - LangSmith Tracing Setup
# -----------------------------------------------------------------------------
#
# WHY THIS FILE?
#   When any code imports from the agents package, this runs first.
#   We use it to configure LangSmith - the observability tool from LangChain
#   that records every LLM call, retrieval, and graph step.
#
# WHAT IS LANGSMITH?
#   Think of it like a dashcam for your AI:
#     - Every question the customer asks       is logged
#     - Every chunk retrieved from Qdrant      is logged
#     - Every GPT-4o-mini call (input/output)  is logged
#     - Whether the bot escalated to human     is logged
#     - How long each step took                is logged
#
#   You can view all traces at: https://smith.langchain.com
#   Project name: "supportos-prod"
# -----------------------------------------------------------------------------

import os
from core.config import settings

# ── Enable LangSmith tracing ──────────────────────────────────────────────────
# LangChain looks for these specific environment variable names.
# We read from our .env (via settings) and set them here.
os.environ["LANGCHAIN_TRACING_V2"] = "true"
os.environ["LANGCHAIN_API_KEY"] = settings.LANGSMITH_API_KEY
os.environ["LANGCHAIN_PROJECT"] = settings.LANGSMITH_PROJECT or "supportos-prod"

print(f"[agents] LangSmith tracing ON - project: {os.environ['LANGCHAIN_PROJECT']}")
