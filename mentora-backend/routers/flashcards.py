"""Flashcards Router — generate, list, create, delete flashcards."""
import uuid
import json
import time
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from database.connection import get_db
from models.flashcard import (
    FlashcardGenerateRequest, FlashcardModel,
    FlashcardCreateRequest, FlashcardListResponse,
)
from services import llm_service, rag_pipeline
from routers.auth import get_current_user, UserORM

router = APIRouter(tags=["flashcards"])

FLASHCARD_PROMPT = """Generate {n} flashcards about: {topic}
Each card should test a key concept, definition, or formula.
Return ONLY a valid JSON array:
[
  {{
    "question": "What is ...?",
    "answer": "...",
    "tag": "{topic}",
    "difficulty": "medium"
  }}
]
"""


def _parse_flashcard_json(raw: str, topic: str) -> list:
    raw = raw.strip()
    start = raw.find("[")
    end = raw.rfind("]")
    if start == -1 or end == -1:
        return []
    try:
        cards = json.loads(raw[start : end + 1])
        for card in cards:
            card.setdefault("tag", topic)
            card.setdefault("difficulty", "medium")
        return cards
    except json.JSONDecodeError:
        return []


@router.post("/flashcards", response_model=FlashcardListResponse)
async def generate_flashcards(
    body: FlashcardGenerateRequest,
    db: AsyncSession = Depends(get_db),
    user: Optional[UserORM] = Depends(get_current_user),
):
    ctx_blocks = []
    if body.doc_id:
        chunks = await rag_pipeline.retrieve_context(body.topic, body.doc_id, top_k=5)
        ctx_blocks = [c["text"] for c in chunks]

    prompt = FLASHCARD_PROMPT.format(n=body.n, topic=body.topic)
    if ctx_blocks:
        ctx_str = "\n---\n".join(ctx_blocks[:3])
        prompt = f"Context:\n{ctx_str}\n\n{prompt}"

    raw = await llm_service.complete(prompt, temperature=0.4)
    cards = _parse_flashcard_json(raw, body.topic)

    if not cards:
        raise HTTPException(500, "Failed to generate flashcards")

    now_ms = int(time.time() * 1000)
    out_cards = []
    for card in cards:
        card_id = str(uuid.uuid4())
        await db.execute(
            text(
                "INSERT INTO flashcards (id, user_id, doc_id, question, answer, tag, difficulty, created) "
                "VALUES (:id, :uid, :did, :q, :a, :tag, :diff, :now)"
            ),
            {
                "id": card_id,
                "uid": str(user.id) if user else None,
                "did": body.doc_id,
                "q": card["question"],
                "a": card["answer"],
                "tag": card.get("tag", body.topic),
                "diff": card.get("difficulty", "medium"),
                "now": now_ms,
            },
        )
        out_cards.append(
            FlashcardModel(
                id=card_id,
                question=card["question"],
                answer=card["answer"],
                tag=card.get("tag", body.topic),
                difficulty=card.get("difficulty", "medium"),
                created=now_ms,
            )
        )
    await db.commit()
    return FlashcardListResponse(flashcards=out_cards)


@router.get("/flashcards", response_model=FlashcardListResponse)
async def list_flashcards(
    db: AsyncSession = Depends(get_db),
    user: Optional[UserORM] = Depends(get_current_user),
):
    stmt = "SELECT id, question, answer, tag, difficulty, created FROM flashcards"
    params: dict = {}
    if user:
        stmt += " WHERE user_id = :uid"
        params["uid"] = str(user.id)
    stmt += " ORDER BY created DESC"
    result = await db.execute(text(stmt), params)
    rows = result.fetchall()
    return FlashcardListResponse(
        flashcards=[
            FlashcardModel(
                id=str(r[0]),
                question=r[1],
                answer=r[2],
                tag=r[3] or "",
                difficulty=r[4] or "medium",
                created=r[5] or 0,
            )
            for r in rows
        ]
    )


@router.delete("/flashcards", status_code=204)
async def delete_all_flashcards(
    db: AsyncSession = Depends(get_db),
    user: Optional[UserORM] = Depends(get_current_user),
):
    if user:
        await db.execute(
            text("DELETE FROM flashcards WHERE user_id = :uid"),
            {"uid": str(user.id)},
        )
    await db.commit()


@router.delete("/flashcards/{card_id}", status_code=204)
async def delete_flashcard(
    card_id: str,
    db: AsyncSession = Depends(get_db),
    user: Optional[UserORM] = Depends(get_current_user),
):
    await db.execute(text("DELETE FROM flashcards WHERE id = :id"), {"id": card_id})
    await db.commit()
