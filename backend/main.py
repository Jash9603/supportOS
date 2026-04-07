# -----------------------------------------------------------------------------
# main.py — App Entry Point
# -----------------------------------------------------------------------------
# This is the heart of the backend. It:
#
#   1. Creates the FastAPI app instance
#   2. Sets up CORS (decides which frontends are allowed to talk to this API)
#   3. Registers all the routers (auth, tickets, websocket, chatbot, analytics)
#   4. Provides the /health endpoint so we can quickly check if the server is up
#
# When you run `uvicorn main:app --reload`, Python starts here.
#
# Routers are imported and registered here. During early development, routers
# that don't exist yet are commented out — uncomment as each piece is built.
# -----------------------------------------------------------------------------

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from core.config import settings
from core.redis import close_redis

# ── Router imports ────────────────────────────────────
# Comment out routers that don't exist yet — uncomment as each piece is built.
from routers import auth
from routers import tickets       # Piece 2.2
from routers import widget        # Piece 2.3
from routers import inbox_ws      # Piece 2.3
from routers import chatbot       # Piece 3.1
from routers import analytics     # Piece 4.1


# ── Lifespan (startup / shutdown) ────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Nothing to init on startup yet
    yield
    # Clean shutdown: close Redis connection pool
    await close_redis()


# ── App ───────────────────────────────────────────────
app = FastAPI(
    title="SupportOS API",
    version="1.0.0",
    description="AI-powered customer support platform",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────
# Origins read from ALLOWED_ORIGINS env var — never hardcoded.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins_list,
    allow_credentials=True,   # required for httpOnly cookie auth
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Static files (widget.js loader) ────────────────────
app.mount("/static", StaticFiles(directory="static"), name="static")

# ── Routers ───────────────────────────────────────────
app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(tickets.router,   prefix="/tickets",   tags=["Tickets"])
app.include_router(widget.router,    tags=["Widget"])
app.include_router(inbox_ws.router,  tags=["Inbox WS"])
app.include_router(chatbot.router,   prefix="/chatbot",   tags=["Chatbot"])
app.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])


# ── Health check ──────────────────────────────────────
@app.get("/health", tags=["Health"])
async def health():
    return {"status": "ok", "version": "1.0.0"}
