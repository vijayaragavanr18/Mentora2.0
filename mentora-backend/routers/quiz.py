"""Quiz Router — generate and submit quizzes."""
import uuid
import json
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from database.connection import get_db
from models.quiz import QuizGenerateRequest, QuizResponse, SubmitAnswerRequest, QuizResultResponse
from services import llm_service, rag_pipeline
from routers.auth import get_current_user, UserORM

router = APIRouter(tags=["quiz"])

QUIZ_PROMPT = """Generate {n} quiz questions about: {topic}
Difficulty: {difficulty}
Types: {types}

Return ONLY a valid JSON array with no extra text:
[
  {{
    "id": "q1",
    "type": "mcq",
    "question": "...",
    "choices": [
      {{"label": "A", "text": "..."}},
      {{"label": "B", "text": "..."}},
      {{"label": "C", "text": "..."}},
      {{"label": "D", "text": "..."}}
    ],
    "answer": "A",
    "explanation": "...",
    "topic": "{topic}"
  }}
]
"""


def _parse_quiz_json(raw: str, topic: str) -> list:
    """Extract JSON array from LLM output."""
    raw = raw.strip()
    # Find first [ and last ]
    start = raw.find("[")
    end = raw.rfind("]")
    if start == -1 or end == -1:
        return []
    try:
        questions = json.loads(raw[start : end + 1])
        for i, q in enumerate(questions):
            if "id" not in q:
                q["id"] = f"q{i+1}"
            if "topic" not in q:
                q["topic"] = topic
        return questions
    except json.JSONDecodeError:
        return []


@router.post("/quiz", response_model=QuizResponse)
async def generate_quiz(
    body: QuizGenerateRequest,
    db: AsyncSession = Depends(get_db),
    user: Optional[UserORM] = Depends(get_current_user),
):
    # Build context from RAG if doc_id provided
    context_blocks = []
    if body.doc_id:
        chunks = await rag_pipeline.retrieve_context(body.topic, body.doc_id, top_k=6)
        context_blocks = [c["text"] for c in chunks]

    prompt = QUIZ_PROMPT.format(
        n=body.n,
        topic=body.topic,
        difficulty=body.difficulty,
        types=", ".join(body.types),
    )
    if context_blocks:
        context_str = "\n---\n".join(context_blocks[:4])
        prompt = f"Context (use this material):\n{context_str}\n\n{prompt}"

    raw = await llm_service.complete(prompt, temperature=0.4)
    questions = _parse_quiz_json(raw, body.topic)

    if not questions:
        raise HTTPException(500, "Failed to generate quiz questions. Try again.")

    quiz_id = str(uuid.uuid4())

    # Persist to DB
    from sqlalchemy import text
    await db.execute(
        text(
            "INSERT INTO quizzes (id, quiz_id, user_id, doc_id, topic, questions, difficulty, num_questions) "
            "VALUES (:id, :qid, :uid, :did, :topic, :questions, :diff, :num)"
        ),
        {
            "id": str(uuid.uuid4()),
            "qid": quiz_id,
            "uid": str(user.id) if user else None,
            "did": body.doc_id,
            "topic": body.topic,
            "questions": json.dumps(questions),
            "diff": body.difficulty,
            "num": body.n,
        },
    )
    await db.commit()

    return QuizResponse(quiz_id=quiz_id, topic=body.topic, questions=questions)


@router.post("/quiz/submit", response_model=QuizResultResponse)
async def submit_quiz(
    body: SubmitAnswerRequest,
    db: AsyncSession = Depends(get_db),
    user: Optional[UserORM] = Depends(get_current_user),
):
    from sqlalchemy import text

    result = await db.execute(
        text("SELECT questions FROM quizzes WHERE quiz_id = :qid"),
        {"qid": body.quiz_id},
    )
    row = result.fetchone()
    if not row:
        raise HTTPException(404, "Quiz not found")

    questions = json.loads(row[0])
    answer_map = {ans["question_id"]: ans.get("selected") for ans in body.answers}

    score = 0
    breakdown = []
    for q in questions:
        correct = q.get("answer", "")
        selected = answer_map.get(q["id"], "")
        is_correct = selected == correct
        if is_correct:
            score += 1
        breakdown.append(
            {
                "question_id": q["id"],
                "question": q.get("question", ""),
                "selected": selected,
                "correct": correct,
                "is_correct": is_correct,
                "explanation": q.get("explanation", ""),
            }
        )

    total = len(questions)
    percentage = round((score / total) * 100, 1) if total > 0 else 0
    xp = score * 5 + (50 if score == total else 0)

    await db.execute(
        text(
            "INSERT INTO quiz_results (id, quiz_id, user_id, answers, score, total, xp_earned) "
            "VALUES (:id, :qid, :uid, :answers, :score, :total, :xp)"
        ),
        {
            "id": str(uuid.uuid4()),
            "qid": body.quiz_id,
            "uid": str(user.id) if user else None,
            "answers": json.dumps(body.answers),
            "score": score,
            "total": total,
            "xp": xp,
        },
    )
    await db.commit()

    return QuizResultResponse(
        quiz_id=body.quiz_id,
        score=score,
        total=total,
        percentage=percentage,
        xp_earned=xp,
        breakdown=breakdown,
    )
