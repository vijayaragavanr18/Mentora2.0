"""Tools Router — Podcast generator, Smart Notes, Transcriber, Generate."""
import uuid
import os
import shutil
import logging
from typing import Optional, List

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
logger = logging.getLogger("mentora.tools")


def _resolve_chroma_id(doc_id: str) -> str:
    """
    Normalise a document reference to a ChromaDB collection ID.
    The frontend may send either the raw DB UUID or the full 'doc_<uuid>' form.
    """
    return doc_id if doc_id.startswith("doc_") else f"doc_{doc_id}"


# ─── Generate (NotebookLM-style outputs) ──────────────────────────────────────
class GenerateRequest(BaseModel):
    type: str                           # summary | study-guide | faq | briefing | timeline | outline | quiz | flashcards
    doc_ids: Optional[List[str]] = None # chroma collection IDs (doc_xxx)
    topic: Optional[str] = None         # fallback topic label


_GENERATE_PROMPTS: dict = {
    "summary": (
        "You are an expert academic summariser.\n"
        "Using ONLY the document excerpts below, write a clear, structured summary:\n"
        "- 1 paragraph of 3-4 sentences giving the overall topic and purpose\n"
        "- 3-5 bullet points for the most important facts / arguments\n"
        "- 1 sentence 'Key takeaway'\n\n"
        "Document excerpts:\n{context}\n\nSummary:"
    ),
    "study-guide": (
        "You are a professional study-guide author.\n"
        "Using the document excerpts below, create a comprehensive study guide:\n"
        "## Overview\n(2-3 sentences)\n\n## Core Concepts\n(numbered list with brief definitions)\n\n"
        "## Key Facts & Details\n(bullet points grouped by sub-topic)\n\n"
        "## Important Relationships\n(how concepts connect)\n\n"
        "## Exam Tips\n(3-4 tips based on this material)\n\n"
        "Document excerpts:\n{context}\n\nStudy Guide:"
    ),
    "faq": (
        "You are a skilled educator.\n"
        "Based ONLY on the document excerpts below, generate 8 frequently-asked questions with concise, accurate answers.\n"
        "Format each as:\nQ: <question>\nA: <answer>\n\n"
        "Document excerpts:\n{context}\n\nFAQs:"
    ),
    "briefing": (
        "You are a professional briefing writer.\n"
        "Write an executive briefing document from the excerpts below:\n"
        "**SUBJECT:** (one line)\n**DATE:** (use 'Current')\n**PURPOSE:** (one sentence)\n"
        "**BACKGROUND:** (2-3 sentences)\n**KEY POINTS:**\n(5 bullet points)\n"
        "**RECOMMENDATIONS / ACTION ITEMS:**\n(2-3 bullet points)\n\n"
        "Document excerpts:\n{context}\n\nBriefing:"
    ),
    "timeline": (
        "You are a historian and educator.\n"
        "From the document excerpts below, extract and organise all events, processes, or steps in chronological or logical order.\n"
        "Format as:\n[Step/Date/Era] — Description\n\n"
        "If no explicit dates exist, use logical ordering (Step 1, Step 2, …).\n\n"
        "Document excerpts:\n{context}\n\nTimeline:"
    ),
    "outline": (
        "You are a curriculum designer.\n"
        "Create a hierarchical topic outline from the document excerpts below.\n"
        "Use:\nI. Major Topic\n  A. Sub-topic\n    1. Detail\n    2. Detail\n  B. Sub-topic\nII. Major Topic\n…\n\n"
        "Document excerpts:\n{context}\n\nOutline:"
    ),
}


@router.post("/generate")
async def generate_content(
    body: GenerateRequest,
    user: Optional[UserORM] = Depends(get_current_user),
):
    """
    NotebookLM-style generation.  Retrieves RAG context from one or more
    documents, then runs a type-specific prompt through the LLM.
    """
    output_type = body.type.lower()
    logger.info("🔮 [GENERATE] type=%s  doc_ids=%s", output_type, body.doc_ids)

    # ── Retrieve context from all selected docs ────────────────────────────
    context_parts: List[str] = []
    if body.doc_ids:
        for did in body.doc_ids:
            chroma_id = _resolve_chroma_id(did)
            try:
                chunks = await rag_pipeline.retrieve_context(
                    body.topic or output_type, chroma_id, top_k=4
                )
                for c in chunks:
                    page = c.get("metadata", {}).get("page")
                    label = f"[{chroma_id} p.{page}]" if page else f"[{chroma_id}]"
                    context_parts.append(f"{label}\n{c['text']}")
            except Exception as e:
                logger.warning("[GENERATE] Context retrieval failed for %s: %s", chroma_id, e)

    if not context_parts:
        context_str = f"Topic: {body.topic or output_type}\n(No uploaded document context available — answer from general knowledge.)"
    else:
        context_str = "\n\n---\n\n".join(context_parts[:16])  # cap at 16 chunks

    # ── Quiz and Flashcards are handled separately ─────────────────────────
    if output_type == "quiz":
        from routers.quiz import QuizRequest
        topic = body.topic or "the uploaded document"
        prompt = (
            f"You are a quiz master. Using the content below, generate 6 multiple-choice questions.\n"
            f"For each question output EXACTLY:\nQ: <question>\nA) <choice>\nB) <choice>\nC) <choice>\nD) <choice>\nAnswer: <letter>\n\n"
            f"Content:\n{context_str}\n\nQuiz:"
        )
        text_out = await llm_service.generate(prompt)
        return {"type": output_type, "content": text_out}

    if output_type == "flashcards":
        prompt = (
            f"Using the content below, create 8 flashcards.\n"
            f"For each card output EXACTLY:\nFRONT: <term or question>\nBACK: <definition or answer>\n\n"
            f"Content:\n{context_str}\n\nFlashcards:"
        )
        text_out = await llm_service.generate(prompt)
        return {"type": output_type, "content": text_out}

    # ── Structured outputs ─────────────────────────────────────────────────
    prompt_template = _GENERATE_PROMPTS.get(output_type)
    if not prompt_template:
        raise HTTPException(400, f"Unknown generation type: {output_type}")

    prompt = prompt_template.format(context=context_str)
    logger.info("⏳ [GENERATE] Sending prompt to LLM (context chars=%d)", len(context_str))
    text_out = await llm_service.generate(prompt, system="You are Mentora, a helpful AI study assistant. Be clear and concise.")
    logger.info("✅ [GENERATE] Done — output chars=%d", len(text_out))

    return {"type": output_type, "content": text_out}


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
