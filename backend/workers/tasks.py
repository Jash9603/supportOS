# -----------------------------------------------------------------------------
# workers/tasks.py - Background Task Definitions
# -----------------------------------------------------------------------------
#
# WHAT IS THIS FILE?
# This is where we define the actual "kitchen recipes" - the heavy jobs
# that would be too slow to run inside a normal API request.
#
# RIGHT NOW: We have one task → ingest_document
# WHAT IT DOES:
#   1. Reads a PDF or .txt file from disk
#   2. Splits it into small chunks (~512 words each)
#   3. Sends each chunk to OpenAI to get an "embedding" (a math representation)
#   4. Stores those embeddings in Qdrant (our vector database)
#   5. Updates the document status in Postgres (processing → indexed / failed)
#
# WHY A BACKGROUND TASK?
#   A 50-page PDF might take 30+ seconds to process.
#   If we did this inside the API request, the user would stare at a spinner
#   for 30 seconds. Instead:
#     - API says "Got it, processing!" instantly (200 OK)
#     - Celery does the heavy lifting in the background
#     - Frontend polls GET /chatbot/documents/{id}/status every 2 seconds
#     - Eventually shows ✓ "Indexed - 24 chunks"
#
# HOW TO ADD A NEW TASK:
#   1. Write a function here decorated with @celery_app.task
#   2. Call it from your API route with: task_name.delay(arg1, arg2)
#      (.delay() = "send this to the kitchen, don't wait")
# -----------------------------------------------------------------------------

from workers.celery_app import celery_app

# We use SYNCHRONOUS database and service calls here because
# Celery workers run in their own process, separate from the async FastAPI server.
# Think of it as: the kitchen has its own stove, doesn't share with the waiter.
import sqlalchemy
from sqlalchemy import create_engine
from sqlalchemy.orm import Session as SyncSession, sessionmaker
from core.config import settings

# Convert async DB URL to sync (asyncpg → psycopg2)
# Celery can't use async - it has its own event loop
# Also translate asyncpg's ?ssl=require to psycopg2's ?sslmode=require
sync_db_url = settings.DATABASE_URL.replace("postgresql+asyncpg", "postgresql+psycopg2").replace("?ssl=require", "?sslmode=require")


@celery_app.task(bind=True, max_retries=3)
def ingest_document(self, org_id: str, doc_id: str, file_path: str):
    """
    Background task: process an uploaded document for the AI knowledge base.

    Steps:
      1. Read the file (PDF or plain text)
      2. Split into chunks
      3. Generate embeddings via OpenAI
      4. Store in Qdrant (vector DB)
      5. Update document status in Postgres

    If anything fails, Celery retries up to 3 times with a 30-second delay.

    Args:
        org_id:    The organisation UUID (string)
        doc_id:    The kb_document UUID (string)
        file_path: Where the uploaded file was temporarily saved
    """
    try:
        # ── Step 1: Update status to "processing" ────────────────
        engine = create_engine(sync_db_url)
        SessionLocal = sessionmaker(bind=engine)
        db = SessionLocal()

        from models.kb_document import KbDocument
        doc = db.query(KbDocument).filter(KbDocument.id == doc_id).first()
        if not doc:
            print(f"[ingest_document] Document {doc_id} not found, skipping.")
            db.close()
            return

        doc.status = "processing"
        db.commit()

        # ── Step 2: Read the file ────────────────────────────────
        import os
        if file_path.endswith(".pdf"):
            from pypdf import PdfReader
            reader = PdfReader(file_path)
            text = "\n".join(page.extract_text() or "" for page in reader.pages)
        else:
            with open(file_path, "r", encoding="utf-8") as f:
                text = f.read()

        if not text.strip():
            doc.status = "failed"
            db.commit()
            db.close()
            print(f"[ingest_document] Empty file: {file_path}")
            return

        # ── Step 3: Chunk the text ───────────────────────────────
        # Split into ~512 word chunks with 50 word overlap
        # Overlap ensures we don't cut off a sentence mid-thought
        words = text.split()
        chunk_size = 512
        overlap = 50
        chunks = []
        for i in range(0, len(words), chunk_size - overlap):
            chunk = " ".join(words[i:i + chunk_size])
            if chunk.strip():
                chunks.append(chunk)

        # ── Step 4: Generate embeddings ──────────────────────────
        from openai import OpenAI
        openai_client = OpenAI(api_key=settings.OPENAI_API_KEY)

        response = openai_client.embeddings.create(
            model="text-embedding-3-small",
            input=chunks
        )
        embeddings = [item.embedding for item in response.data]

        # ── Step 5: Store in Qdrant ──────────────────────────────
        import uuid
        from qdrant_client import QdrantClient
        from qdrant_client.models import VectorParams, Distance, PointStruct

        qdrant = QdrantClient(
            url=settings.QDRANT_URL,
            api_key=settings.QDRANT_API_KEY or None,
        )

        collection_name = f"org_{org_id}_kb"

        # Create collection if it doesn't exist yet
        if not qdrant.collection_exists(collection_name):
            qdrant.create_collection(
                collection_name=collection_name,
                vectors_config=VectorParams(size=1536, distance=Distance.COSINE),
            )

        # Build points (each chunk = one point in vector space)
        points = [
            PointStruct(
                # Deterministic ID: re-uploading same doc replaces, doesn't duplicate
                id=str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{doc_id}_{i}")),
                vector=embeddings[i],
                payload={"doc_id": doc_id, "chunk_index": i, "text": chunks[i]},
            )
            for i in range(len(chunks))
        ]

        qdrant.upsert(collection_name=collection_name, points=points)

        # ── Step 6: Update document status ───────────────────────
        doc.status = "indexed"
        doc.chunk_count = len(chunks)
        db.commit()
        db.close()

        # Clean up temp file
        if os.path.exists(file_path):
            os.remove(file_path)

        print(f"[ingest_document] ✓ {file_path} → {len(chunks)} chunks indexed for org {org_id}")

    except Exception as exc:
        print(f"[ingest_document] ✗ Failed: {exc}")
        # Retry after 30 seconds (up to 3 times)
        # If all retries fail, Celery marks the task as permanently failed
        try:
            engine = create_engine(sync_db_url)
            SessionLocal = sessionmaker(bind=engine)
            db = SessionLocal()
            from models.kb_document import KbDocument
            doc = db.query(KbDocument).filter(KbDocument.id == doc_id).first()
            if doc:
                doc.status = "failed"
                db.commit()
            db.close()
        except Exception:
            pass
        self.retry(countdown=30, exc=exc)
