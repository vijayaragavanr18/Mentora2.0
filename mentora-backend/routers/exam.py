"""Exam Router — list exams and run exam simulations."""
import uuid
import json
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from database.connection import get_db
from models.quiz import ExamGenerateRequest
from services import llm_service
from routers.auth import get_current_user, UserORM

router = APIRouter(tags=["exam"])

# Seed exam templates
EXAM_TEMPLATES = [
    {
        "exam_id": "jee-mains",
        "name": "JEE Mains",
        "sections": [
            {"name": "Physics", "questions": 25, "time_mins": 60},
            {"name": "Chemistry", "questions": 25, "time_mins": 60},
            {"name": "Mathematics", "questions": 25, "time_mins": 60},
        ],
    },
    {
        "exam_id": "neet",
        "name": "NEET",
        "sections": [
            {"name": "Physics", "questions": 45, "time_mins": 60},
            {"name": "Chemistry", "questions": 45, "time_mins": 60},
            {"name": "Biology", "questions": 90, "time_mins": 60},
        ],
    },
    {
        "exam_id": "cbse-10",
        "name": "CBSE Class 10 Board",
        "sections": [
            {"name": "Mathematics", "questions": 40, "time_mins": 180},
            {"name": "Science", "questions": 40, "time_mins": 180},
        ],
    },
    {
        "exam_id": "cbse-12-pcm",
        "name": "CBSE Class 12 PCM",
        "sections": [
            {"name": "Physics", "questions": 35, "time_mins": 180},
            {"name": "Chemistry", "questions": 35, "time_mins": 180},
            {"name": "Mathematics", "questions": 35, "time_mins": 180},
        ],
    },
]

EXAM_QUESTION_PROMPT = """Generate {n} MCQ exam questions for {exam_name} - {section} section.
Use JEE/NEET/board exam style. Mix easy, medium, hard questions.
Return ONLY a valid JSON array:
[
  {{
    "id": "q1",
    "type": "mcq",
    "section": "{section}",
    "question": "...",
    "choices": [
      {{"label": "A", "text": "..."}},
      {{"label": "B", "text": "..."}},
      {{"label": "C", "text": "..."}},
      {{"label": "D", "text": "..."}}
    ],
    "answer": "A",
    "explanation": "...",
    "difficulty": "medium"
  }}
]
"""


@router.get("/exams")
async def list_exams():
    return EXAM_TEMPLATES


@router.post("/exam")
async def generate_exam(
    body: ExamGenerateRequest,
    db: AsyncSession = Depends(get_db),
    user: Optional[UserORM] = Depends(get_current_user),
):
    # Find template
    template = next((e for e in EXAM_TEMPLATES if e["exam_id"] == body.exam_id), None)
    if not template:
        raise HTTPException(404, f"Exam template '{body.exam_id}' not found")

    all_questions = []
    n_per_section = max(3, (body.num_questions or 40) // len(template["sections"]))

    for section in template["sections"]:
        prompt = EXAM_QUESTION_PROMPT.format(
            n=n_per_section,
            exam_name=template["name"],
            section=section["name"],
        )
        raw = await llm_service.complete(prompt, temperature=0.4)
        try:
            start = raw.find("[")
            end = raw.rfind("]")
            questions = json.loads(raw[start : end + 1])
            all_questions.extend(questions)
        except Exception:
            pass  # Skip failed section

    if not all_questions:
        raise HTTPException(500, "Failed to generate exam questions")

    run_id = str(uuid.uuid4())
    await db.execute(
        text(
            "INSERT INTO exam_runs (id, run_id, exam_id, user_id, questions) "
            "VALUES (:id, :rid, :eid, :uid, :q)"
        ),
        {
            "id": str(uuid.uuid4()),
            "rid": run_id,
            "eid": body.exam_id,
            "uid": str(user.id) if user else None,
            "q": json.dumps(all_questions),
        },
    )
    await db.commit()

    return {
        "run_id": run_id,
        "exam_id": body.exam_id,
        "exam_name": template["name"],
        "questions": all_questions,
        "total": len(all_questions),
    }
