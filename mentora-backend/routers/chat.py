"""Chat Router — REST and streaming chat endpoints."""
import uuid
import json
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from database.connection import get_db
from services import rag_pipeline
from routers.auth import get_current_user, UserORM

router = APIRouter(tags=["chat"])


def _resolve_chroma_ids(ids: Optional[List[str]]) -> Optional[List[str]]:
    """Normalise doc IDs to 'doc_<uuid>' form (ChromaDB collection names)."""
    if not ids:
        return ids
    return [d if d.startswith("doc_") else f"doc_{d}" for d in ids]


class ChatRequest(BaseModel):
    q: str
    doc_id: Optional[str] = None
    doc_ids: Optional[List[str]] = None   # multi-source support
    chat_id: Optional[str] = None
    history: Optional[List[dict]] = None
    stream: bool = True


class ChatJSONRequest(BaseModel):
    q: Optional[str] = None
    message: Optional[str] = None
    doc_id: Optional[str] = None
    doc_ids: Optional[List[str]] = None   # multi-source support
    chat_id: Optional[str] = None
    history: Optional[List[dict]] = None


# ── POST /chat — streaming SSE ─────────────────────────────────────────────────
@router.post("/chat")
async def chat_stream(
    body: ChatRequest,
    user: Optional[UserORM] = Depends(get_current_user),
):
    """Stream a chat answer as Server-Sent Events."""
    query = body.q.strip()
    if not query:
        raise HTTPException(400, "query is required")

    async def event_gen():
        citations_sent = False
        # Resolve doc_ids: prefer doc_ids list, fall back to single doc_id
        raw_ids = body.doc_ids or ([body.doc_id] if body.doc_id else None)
        resolved_ids = _resolve_chroma_ids(raw_ids)
        try:
            async for token in rag_pipeline.stream_answer(
                query, resolved_ids, body.history
            ):
                if token.startswith("__CITATIONS__"):
                    # Send citations as a special event
                    cit_json = token.replace("__CITATIONS__", "")
                    yield f"event: citations\ndata: {cit_json}\n\n"
                    citations_sent = True
                else:
                    payload = json.dumps({"token": token})
                    yield f"data: {payload}\n\n"
        except Exception as e:
            yield f"event: error\ndata: {json.dumps({'error': str(e)})}\n\n"
        if not citations_sent:
            yield "event: citations\ndata: []\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_gen(), media_type="text/event-stream")


# ── POST /chats — JSON (non-streaming) ────────────────────────────────────────
@router.post("/chats")
async def chat_json(
    body: ChatJSONRequest,
    user: Optional[UserORM] = Depends(get_current_user),
):
    """Non-streaming JSON chat response."""
    query = (body.q or body.message or "").strip()
    if not query:
        raise HTTPException(400, "query or message is required")

    # Resolve doc_ids: prefer doc_ids list, fall back to single doc_id
    raw_ids = body.doc_ids or ([body.doc_id] if body.doc_id else None)
    resolved_ids = _resolve_chroma_ids(raw_ids)
    response, citations = await rag_pipeline.answer(query, resolved_ids)
    chat_id = body.chat_id or str(uuid.uuid4())
    return {
        "chat_id": chat_id,
        "response": response,
        "citations": citations,
    }


# ── GET /chats — list sessions ─────────────────────────────────────────────────
@router.get("/chats")
async def list_chats(
    user: Optional[UserORM] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import text
    # For unauthenticated users return empty list
    if not user:
        return {"ok": True, "chats": []}
    # Get unique chats with the first user message as title
    result = await db.execute(
        text(
            "SELECT cm.chat_id, MAX(cm.created_at) as updated_at, "
            "  (SELECT content FROM chat_messages "
            "   WHERE chat_id = cm.chat_id AND role = 'user' "
            "   ORDER BY created_at ASC LIMIT 1) as title "
            "FROM chat_messages cm "
            "GROUP BY cm.chat_id "
            "ORDER BY updated_at DESC LIMIT 50"
        )
    )
    rows = result.fetchall()
    chats = [
        {
            "id": r[0],
            "updated_at": str(r[1]) if r[1] else None,
            "title": (r[2] or "Untitled")[:80],
        }
        for r in rows
    ]
    return {"ok": True, "chats": chats}


# ── GET /chats/{chat_id} — message history ─────────────────────────────────────
@router.get("/chats/{chat_id}")
async def get_chat(
    chat_id: str,
    user: Optional[UserORM] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import text
    result = await db.execute(
        text(
            "SELECT role, content, citations, created_at FROM chat_messages "
            "WHERE chat_id = :cid ORDER BY created_at ASC"
        ),
        {"cid": chat_id},
    )
    rows = result.fetchall()
    messages = [
        {
            "role": r[0],
            "content": r[1],
            "citations": r[2] or [],
            "created_at": str(r[3]) if r[3] else None,
        }
        for r in rows
    ]
    return {"ok": True, "chat": {"id": chat_id}, "messages": messages}
