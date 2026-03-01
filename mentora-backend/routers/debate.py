"""Debate Router — AI debate partner."""
import uuid
import json
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from database.connection import get_db
from models.debate import (
    DebateStartRequest, DebateArgueRequest,
    DebateResponse, DebateMessage, DebateAnalysis,
)
from services import llm_service, rag_pipeline
from routers.auth import get_current_user, UserORM

router = APIRouter(tags=["debate"])

AI_SYSTEM = """You are a skilled debate opponent. You argue the OPPOSITE position to the user.
Be logical, cite evidence, and challenge weak arguments. Keep responses under 3 paragraphs.
At the end of each response, rate the user's argument strength (1-10) in this exact format:
[STRENGTH: X/10]
"""

ANALYSIS_PROMPT = """Debate topic: {topic}
User position: {position}

Conversation history:
{history}

Analyze this debate objectively. Return ONLY valid JSON:
{{
  "winner": "user" | "ai" | "draw",
  "user_score": 0-100,
  "ai_score": 0-100,
  "feedback": "overall feedback string",
  "user_strengths": ["strength1", "strength2"],
  "user_weaknesses": ["weakness1", "weakness2"],
  "ai_conceded": false
}}
"""


async def _get_debate(debate_id: str, db: AsyncSession) -> dict:
    result = await db.execute(
        text("SELECT * FROM debates WHERE debate_id = :did"),
        {"did": debate_id},
    )
    row = result.fetchone()
    if not row:
        raise HTTPException(404, "Debate not found")
    return dict(row._mapping)


@router.post("/debate/start", response_model=DebateResponse)
async def start_debate(
    body: DebateStartRequest,
    db: AsyncSession = Depends(get_db),
    user: Optional[UserORM] = Depends(get_current_user),
):
    debate_id = str(uuid.uuid4())
    ai_position = "against" if body.position == "for" else "for"

    opening_prompt = (
        f"Debate topic: '{body.topic}'\n"
        f"You are arguing {ai_position}. Give your opening argument in 2 paragraphs."
    )
    ai_opening = await llm_service.generate(opening_prompt, system=AI_SYSTEM)

    history = [{"role": "ai", "content": ai_opening}]

    await db.execute(
        text(
            "INSERT INTO debates (id, debate_id, user_id, doc_id, topic, position, history, status) "
            "VALUES (:id, :did, :uid, :docid, :topic, :pos, :hist, 'active')"
        ),
        {
            "id": str(uuid.uuid4()),
            "did": debate_id,
            "uid": str(user.id) if user else None,
            "docid": body.doc_id,
            "topic": body.topic,
            "pos": body.position,
            "hist": json.dumps(history),
        },
    )
    await db.commit()

    return DebateResponse(
        debate_id=debate_id,
        topic=body.topic,
        position=body.position,
        history=[DebateMessage(**m) for m in history],
        status="active",
    )


@router.post("/debate/{debate_id}/argue")
async def argue(
    debate_id: str,
    body: DebateArgueRequest,
    db: AsyncSession = Depends(get_db),
    user: Optional[UserORM] = Depends(get_current_user),
):
    debate = await _get_debate(debate_id, db)
    if debate["status"] != "active":
        raise HTTPException(400, "Debate is not active")

    history: list = json.loads(debate["history"])
    history.append({"role": "user", "content": body.argument})

    # Build context for LLM
    convo = "\n".join(
        [f"{'User' if m['role']=='user' else 'AI'}: {m['content']}" for m in history[-6:]]
    )
    prompt = (
        f"Topic: {debate['topic']}\nYour position: against\n\n"
        f"Conversation so far:\n{convo}\n\nRespond to the user's latest argument."
    )
    ai_reply = await llm_service.generate(prompt, system=AI_SYSTEM)
    history.append({"role": "ai", "content": ai_reply})

    await db.execute(
        text("UPDATE debates SET history = :hist, updated_at = NOW() WHERE debate_id = :did"),
        {"hist": json.dumps(history), "did": debate_id},
    )
    await db.commit()

    return {"debate_id": debate_id, "ai_reply": ai_reply, "history": history}


@router.get("/debate/{debate_id}", response_model=DebateResponse)
async def get_debate(
    debate_id: str,
    db: AsyncSession = Depends(get_db),
):
    debate = await _get_debate(debate_id, db)
    history = json.loads(debate["history"])
    analysis = json.loads(debate["analysis"]) if debate.get("analysis") else None
    return DebateResponse(
        debate_id=debate_id,
        topic=debate["topic"],
        position=debate["position"],
        history=[DebateMessage(**m) for m in history],
        status=debate["status"],
        winner=debate.get("winner"),
        analysis=analysis,
    )


@router.post("/debate/{debate_id}/surrender")
async def surrender(
    debate_id: str,
    db: AsyncSession = Depends(get_db),
    user: Optional[UserORM] = Depends(get_current_user),
):
    await db.execute(
        text("UPDATE debates SET status = 'user_surrendered', winner = 'ai' WHERE debate_id = :did"),
        {"did": debate_id},
    )
    await db.commit()
    return {"debate_id": debate_id, "status": "user_surrendered", "winner": "ai"}


@router.post("/debate/{debate_id}/analyze")
async def analyze_debate(
    debate_id: str,
    db: AsyncSession = Depends(get_db),
    user: Optional[UserORM] = Depends(get_current_user),
):
    debate = await _get_debate(debate_id, db)
    history = json.loads(debate["history"])
    history_str = "\n".join(
        [f"{'User' if m['role']=='user' else 'AI'}: {m['content']}" for m in history]
    )
    prompt = ANALYSIS_PROMPT.format(
        topic=debate["topic"],
        position=debate["position"],
        history=history_str,
    )
    raw = await llm_service.complete(prompt, temperature=0.2)

    # Parse JSON
    try:
        start = raw.find("{")
        end = raw.rfind("}") + 1
        analysis = json.loads(raw[start:end])
    except Exception:
        analysis = {"winner": "draw", "user_score": 50, "ai_score": 50, "feedback": raw}

    winner = analysis.get("winner", "draw")
    await db.execute(
        text(
            "UPDATE debates SET status='completed', winner=:w, analysis=:a WHERE debate_id=:did"
        ),
        {"w": winner, "a": json.dumps(analysis), "did": debate_id},
    )
    await db.commit()

    return {"debate_id": debate_id, "analysis": analysis}
