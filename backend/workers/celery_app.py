# -----------------------------------------------------------------------------
# workers/celery_app.py — Celery Application Configuration
# -----------------------------------------------------------------------------
#
# WHAT IS THIS FILE?
# Think of this as the "kitchen manager" — it sets up the Celery system.
# It tells Celery:
#   1. WHERE to pick up task orders (Redis = the order board)
#   2. WHERE to store results when tasks finish (also Redis)
#   3. WHICH task files to look in (workers/tasks.py)
#
# HOW IT CONNECTS:
#   FastAPI (the waiter) → drops a task onto Redis (the order board)
#   Celery worker (the kitchen) → picks it up and processes it
#   Redis (the results board) → stores "done" / "failed" status
#
# HOW TO RUN THE WORKER (separate terminal):
#   cd e:\supportOS\backend
#   celery -A workers.celery_app worker --loglevel=info --pool=solo
#   (--pool=solo is needed on Windows, Linux can use default)
# -----------------------------------------------------------------------------

from celery import Celery
from core.config import settings

# Create the Celery app instance
# "supportos" is just a name tag — like naming your kitchen "SupportOS Kitchen"
celery_app = Celery(
    "supportos",
    broker=settings.REDIS_URL,       # WHERE tasks are queued (Redis)
    backend=settings.REDIS_URL,      # WHERE results are stored (also Redis)
    include=["workers.tasks"],       # WHICH Python files contain task functions
)

# Configuration — how should Celery behave?
celery_app.conf.update(
    task_serializer="json",          # tasks are sent as JSON (not pickle — safer)
    result_serializer="json",        # results come back as JSON too
    accept_content=["json"],         # only accept JSON (reject everything else)
    timezone="UTC",                  # all timestamps in UTC
    task_track_started=True,         # track when a task actually starts running
)
