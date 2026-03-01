"""Tools Router — Podcast generator, Smart Notes, Transcriber."""
import uuid
import os
import shutil
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from pydantic import BaseModel

from database.connection import get_db
from services import llm_service, tts_service, transcription_service, rag_pipeline
from routers.auth import get_current_user, UserORM
from config import get_settings

router = APIRouter(tags=["tools"])
settings = get_settings()


# ─── Podcast ──────────────────────────────────────────────────────────────────
class PodcastRequest(BaseModel):
    topic: str
    doc_id: Optional[str] = None
    style: str = "educational"  # educational | debate | storytelling
    duration: str = "short"     # short (3 min) | medium (7 min) | long (15 min)


PODCAST_PROMPT = """Write a podcast script about: {topic}
Style: {style}
Target duration: {duration}

{context}

Write an engaging podcast script with:
- A compelling introduction
- Key concepts explained clearly
- Real-world examples
- A memorable conclusion

Script:"""


@router.post("/podcast")
async def generate_podcast(
    body: PodcastRequest,
    db: AsyncSession = Depends(get_db),
    user: Optional[UserORM] = Depends(get_current_user),
):
    # Build RAG context if doc_id
    context_str = ""
    if body.doc_id:
        chunks = await rag_pipeline.retrieve_context(body.topic, body.doc_id, top_k=5)
        context_str = "Document context:\n" + "\n---\n".join(c["text"] for c in chunks)

    prompt = PODCAST_PROMPT.format(
        topic=body.topic,
        style=body.style,
        duration=body.duration,
        context=context_str,
    )
    script = await llm_service.generate(prompt)

    audio_url = await tts_service.generate_podcast_audio(script)
    pid = str(uuid.uuid4())

    await db.execute(
        text(
            "INSERT INTO podcasts (id, pid, user_id, doc_id, topic, script, audio_url, style, status) "
            "VALUES (:id, :pid, :uid, :did, :topic, :script, :audio, :style, 'ready')"
        ),
        {
            "id": str(uuid.uuid4()),
            "pid": pid,
            "uid": str(user.id) if user else None,
            "did": body.doc_id,
            "topic": body.topic,
            "script": script,
            "audio": audio_url,
            "style": body.style,
        },
    )
    await db.commit()

    return {
        "podcast_id": pid,
        "topic": body.topic,
        "script": script,
        "audio_url": audio_url,
        "status": "ready",
    }


# ─── Smart Notes ──────────────────────────────────────────────────────────────
class SmartNotesRequest(BaseModel):
    topic: Optional[str] = None
    doc_id: Optional[str] = None
    format: str = "bullet"   # bullet | outline | cornell | mindmap


SMART_NOTES_PROMPT = """Create {format} notes about: {topic}
{context}

Generate well-structured {format} notes that:
- Highlight key concepts and definitions
- Include important formulas or facts
- Are easy to review and memorize

Notes:"""


@router.post("/smartnotes")
async def generate_smart_notes(
    body: SmartNotesRequest,
    db: AsyncSession = Depends(get_db),
    user: Optional[UserORM] = Depends(get_current_user),
):
    topic = body.topic or "the uploaded document"
    context_str = ""
    if body.doc_id:
        chunks = await rag_pipeline.retrieve_context(topic, body.doc_id, top_k=8)
        context_str = "Document content:\n" + "\n---\n".join(c["text"] for c in chunks)

    prompt = SMART_NOTES_PROMPT.format(
        format=body.format,
        topic=topic,
        context=context_str,
    )
    notes = await llm_service.generate(prompt)

    await db.execute(
        text(
            "INSERT INTO smart_notes (id, user_id, doc_id, content, format) "
            "VALUES (:id, :uid, :did, :content, :fmt)"
        ),
        {
            "id": str(uuid.uuid4()),
            "uid": str(user.id) if user else None,
            "did": body.doc_id,
            "content": notes,
            "fmt": body.format,
        },
    )
    await db.commit()

    return {"topic": topic, "format": body.format, "notes": notes}


# ─── Transcriber ──────────────────────────────────────────────────────────────
@router.post("/transcriber")
async def transcribe_audio(
    file: UploadFile = File(...),
    language: Optional[str] = Form(None),
    generate_materials: bool = Form(False),
    db: AsyncSession = Depends(get_db),
    user: Optional[UserORM] = Depends(get_current_user),
):
    os.makedirs("uploads/audio", exist_ok=True)
    ext = os.path.splitext(file.filename or "")[-1].lower() or ".wav"
    tmp_path = f"uploads/audio/{uuid.uuid4()}{ext}"
    with open(tmp_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    try:
        result = await transcription_service.transcribe(tmp_path, language)
        transcript = result["transcript"]
        study_materials = None

        if generate_materials and transcript:
            materials_prompt = (
                f"Based on this transcript:\n{transcript[:3000]}\n\n"
                "Generate study materials as JSON: "
                '{"summary": "...", "key_points": [...], "quiz_topics": [...]}'
            )
            raw = await llm_service.complete(materials_prompt, temperature=0.3)
            try:
                import json
                start = raw.find("{")
                end = raw.rfind("}") + 1
                study_materials = json.loads(raw[start:end])
            except Exception:
                study_materials = {"summary": raw}

        await db.execute(
            text(
                "INSERT INTO transcriptions (id, user_id, filename, transcript, study_materials) "
                "VALUES (:id, :uid, :fn, :tr, :sm)"
            ),
            {
                "id": str(uuid.uuid4()),
                "uid": str(user.id) if user else None,
                "fn": file.filename,
                "tr": transcript,
                "sm": json.dumps(study_materials) if study_materials else None,
            },
        )
        await db.commit()

        return {
            "transcript": transcript,
            "language": result.get("language", ""),
            "study_materials": study_materials,
        }
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
