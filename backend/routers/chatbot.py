# -----------------------------------------------------------------------------
# routers/chatbot.py - Knowledge Base & Chatbot Configuration API
# -----------------------------------------------------------------------------
#
# WHAT IS THIS?
#   The API endpoints that power the "Chatbot" page in the dashboard.
#   Founders use this to:
#     1. Upload documents (PDF / .txt) to train the AI bot
#     2. See which documents are indexed and how many chunks each has
#     3. Delete documents they no longer need
#     4. Toggle the chatbot ON / OFF for their organisation
#     5. Test the bot with a question (preview pane)
#
# HOW DOCUMENT UPLOAD WORKS:
#   1. Founder drags a PDF into the dashboard
#   2. This router saves it to backend/uploads/ and creates a DB record
#   3. A Celery background task (workers/tasks.py) processes the file:
#      reads → chunks → embeds → stores in Qdrant
#   4. The DB record status changes: "processing" → "indexed" (or "failed")
#   5. The frontend polls GET /chatbot/documents to see the status update
#
# ENDPOINTS:
#   POST   /chatbot/documents           → Upload a file
#   GET    /chatbot/documents           → List all docs for the org
#   GET    /chatbot/documents/{id}      → Get single doc status
#   DELETE /chatbot/documents/{doc_id}  → Delete doc + its Qdrant vectors
#   PATCH  /chatbot/toggle              → Turn chatbot ON/OFF
#   POST   /chatbot/test                → Preview: ask the bot a question
# -----------------------------------------------------------------------------

import os
import uuid
from typing import List

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from core.database import get_db
from dependencies import get_current_user
from models.user import User
from models.kb_document import KbDocument
from models.organisation import Organisation
from schemas.chatbot import KbDocumentResponse, ChatbotToggle, ChatbotTestRequest
from services import rag_service

router = APIRouter()

# Directory where uploaded files are temporarily stored before Celery processes them
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


# ── Upload a document ─────────────────────────────────────────────────────────
@router.post("/documents", response_model=KbDocumentResponse)
async def upload_document(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Upload a PDF or .txt file to the org's knowledge base.
    Processes the document inline (no Celery worker needed).
    """
    # Validate file type
    allowed_extensions = {".pdf", ".txt"}
    _, ext = os.path.splitext(file.filename or "")
    ext = ext.lower()
    if ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Only {', '.join(allowed_extensions)} files are allowed."
        )

    # Save to disk
    doc_id = uuid.uuid4()
    safe_filename = f"{doc_id}{ext}"
    file_path = os.path.join(UPLOAD_DIR, safe_filename)

    contents = await file.read()
    with open(file_path, "wb") as f:
        f.write(contents)

    # Create DB record with status="processing"
    kb_doc = KbDocument(
        id=doc_id,
        org_id=current_user.org_id,
        filename=file.filename or f"document{ext}",
        status="processing",
    )
    db.add(kb_doc)
    await db.commit()
    await db.refresh(kb_doc)

    # ── Process inline instead of Celery ──────────────────────
    try:
        from core.config import settings
        
        # Read the file
        if file_path.endswith(".pdf"):
            from pypdf import PdfReader
            reader = PdfReader(file_path)
            text = "\n".join(page.extract_text() or "" for page in reader.pages)
        else:
            with open(file_path, "r", encoding="utf-8") as f:
                text = f.read()

        if not text.strip():
            kb_doc.status = "failed"
            await db.commit()
            return kb_doc

        # Chunk the text (~512 words, 50 word overlap)
        words = text.split()
        chunk_size = 512
        overlap = 50
        chunks = []
        for i in range(0, len(words), chunk_size - overlap):
            chunk = " ".join(words[i:i + chunk_size])
            if chunk.strip():
                chunks.append(chunk)

        # Generate embeddings via OpenAI
        from openai import OpenAI
        openai_client = OpenAI(api_key=settings.OPENAI_API_KEY)
        response = openai_client.embeddings.create(
            model="text-embedding-3-small",
            input=chunks
        )
        embeddings = [item.embedding for item in response.data]

        # Store in Qdrant
        from qdrant_client import QdrantClient
        from qdrant_client.models import VectorParams, Distance, PointStruct

        qdrant = QdrantClient(
            url=settings.QDRANT_URL,
            api_key=settings.QDRANT_API_KEY or None,
        )

        collection_name = f"org_{current_user.org_id}_kb"

        if not qdrant.collection_exists(collection_name):
            qdrant.create_collection(
                collection_name=collection_name,
                vectors_config=VectorParams(size=1536, distance=Distance.COSINE),
            )

        points = [
            PointStruct(
                id=str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{doc_id}_{i}")),
                vector=embeddings[i],
                payload={"doc_id": str(doc_id), "chunk_index": i, "text": chunks[i]},
            )
            for i in range(len(chunks))
        ]

        qdrant.upsert(collection_name=collection_name, points=points)

        # Update status
        kb_doc.status = "indexed"
        kb_doc.chunk_count = len(chunks)
        await db.commit()
        await db.refresh(kb_doc)

        # Cleanup temp file
        if os.path.exists(file_path):
            os.remove(file_path)

        print(f"[upload] ✓ {file.filename} → {len(chunks)} chunks indexed")

    except Exception as exc:
        print(f"[upload] ✗ Failed: {exc}")
        kb_doc.status = "failed"
        await db.commit()
        await db.refresh(kb_doc)

    return kb_doc


# ── List all documents ────────────────────────────────────────────────────────
@router.get("/documents", response_model=List[KbDocumentResponse])
async def list_documents(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all knowledge base documents for the current org."""
    result = await db.execute(
        select(KbDocument)
        .where(KbDocument.org_id == current_user.org_id)
        .order_by(KbDocument.created_at.desc())
    )
    return result.scalars().all()


# ── Get single document status ────────────────────────────────────────────────
@router.get("/documents/{doc_id}", response_model=KbDocumentResponse)
async def get_document(
    doc_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the status of a specific document (used for polling during ingestion)."""
    result = await db.execute(
        select(KbDocument)
        .where(KbDocument.id == doc_id)
        .where(KbDocument.org_id == current_user.org_id)
    )
    doc = result.scalars().first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


# ── Delete a document ─────────────────────────────────────────────────────────
@router.delete("/documents/{doc_id}")
async def delete_document(
    doc_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a document: removes from DB and deletes its vectors from Qdrant."""
    result = await db.execute(
        select(KbDocument)
        .where(KbDocument.id == doc_id)
        .where(KbDocument.org_id == current_user.org_id)
    )
    doc = result.scalars().first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Delete vectors from Qdrant
    try:
        rag_service.delete_doc_vectors(str(current_user.org_id), str(doc_id))
    except Exception as e:
        print(f"[chatbot] Warning: failed to delete Qdrant vectors: {e}")

    # Delete DB record
    await db.delete(doc)
    await db.commit()

    return {"detail": "Document deleted", "id": str(doc_id)}


# ── Get Chatbot Config ──────────────────────────────────────────────────────────
@router.get("/config")
async def get_chatbot_config(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the current chatbot configuration (enabled/disabled)."""
    result = await db.execute(
        select(Organisation).where(Organisation.id == current_user.org_id)
    )
    org = result.scalars().first()
    if not org:
        raise HTTPException(status_code=404, detail="Organisation not found")
        
    return {
        "chatbot_enabled": org.chatbot_enabled
    }


# ── Toggle chatbot ON/OFF ─────────────────────────────────────────────────────
@router.patch("/toggle")
async def toggle_chatbot(
    body: ChatbotToggle,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Turn the AI chatbot on or off for the org."""
    result = await db.execute(
        select(Organisation).where(Organisation.id == current_user.org_id)
    )
    org = result.scalars().first()
    if not org:
        raise HTTPException(status_code=404, detail="Organisation not found")

    org.chatbot_enabled = body.chatbot_enabled
    await db.commit()
    await db.refresh(org)

    return {
        "chatbot_enabled": org.chatbot_enabled,
        "message": "Chatbot is now LIVE" if org.chatbot_enabled else "Chatbot is now OFF",
    }


# ── Test preview ──────────────────────────────────────────────────────────────
# IMPORTANT: This endpoint is intentionally a sync `def`, NOT `async def`.
# Reason: LangSmith's @traceable decorator and LangChain's ChatOpenAI use
# synchronous HTTP calls internally. If this were async, those calls would
# deadlock the FastAPI event loop (we hit this exact bug during development).
# FastAPI automatically runs sync endpoints in a separate threadpool, which
# avoids the deadlock entirely. Do NOT change this to async without testing.
@router.post("/test")
def test_chatbot(
    body: ChatbotTestRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Test the bot without creating a ticket.
    Searches the knowledge base and generates an AI answer.
    Used by the preview pane on the Chatbot dashboard page.
    """
    org_id = str(current_user.org_id)

    # Step 1: Search knowledge base
    results = rag_service.search_knowledge_base(org_id, body.question, top_k=5)

    if not results or results[0]["score"] < 0.3:
        return {
            "answer": "I don't have enough information in the knowledge base to answer that question. Try uploading more documents!",
            "sources": [],
            "confidence": 0.0,
        }

    # Step 2: Build context from retrieved chunks
    context = "\n---\n".join([r["text"] for r in results])

    # Step 3: Generate answer with Langchain (so it's traced in LangSmith!)
    from langchain_openai import ChatOpenAI
    from langchain_core.messages import SystemMessage, HumanMessage
    from langsmith import traceable
    
    @traceable(name="Dashboard Context Preview")
    def _generate_test_answer(q: str, ctx: str) -> str:
        from core.config import settings
        llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.2, api_key=settings.OPENAI_API_KEY)
        system_prompt = f"""You are a helpful support assistant.
Answer the customer's question using the context provided below. You may reason, count, or summarize the text to form your answer.
If the context is completely unrelated to the question, say "I don't have information about that."
Be concise, helpful, and friendly.

Context:
{ctx}"""
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=q)
        ]
        return llm.invoke(messages).content

    answer = _generate_test_answer(body.question, context)

    return {
        "answer": answer,
        "sources": [{"doc_id": r["doc_id"], "score": round(r["score"], 3)} for r in results[:3]],
        "confidence": round(results[0]["score"], 3),
    }
