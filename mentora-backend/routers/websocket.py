"""WebSocket Router — real-time streaming for chat, quiz, exam, podcast, smartnotes, planner."""
import json
import asyncio
import logging
from typing import Optional

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from services import rag_pipeline, llm_service

router = APIRouter(tags=["websocket"])
log = logging.getLogger("mentora.ws")


async def _ws_safe_send(ws: WebSocket, data: dict) -> bool:
    """Send JSON, returns False if connection is closed."""
    try:
        await ws.send_json(data)
        return True
    except Exception:
        return False


# ── /ws/chat ──────────────────────────────────────────────────────────────────
@router.websocket("/ws/chat")
async def ws_chat(websocket: WebSocket, chatId: Optional[str] = None):
    await websocket.accept()
    log.info("[ws/chat] Connected — chatId=%s", chatId)
    print(f"=> [ws/chat] Connected — chatId={chatId}")

    # ── Step 1: Immediately tell the frontend we are alive ─────────────────
    await _ws_safe_send(websocket, {"type": "connected", "status": "ready"})
    log.info("[ws/chat] Sent 'connected' signal")

    try:
        while True:
            # ── Use receive_text so we can handle parse errors gracefully ──
            try:
                raw = await websocket.receive_text()
            except WebSocketDisconnect:
                log.info("[ws/chat] Client disconnected")
                break
            except Exception as exc:
                print(f"=> [ws/chat] receive_text error: {exc}")
                log.error("[ws/chat] receive_text error: %s", exc)
                break

            log.info("[ws/chat] Received raw: %s", raw[:200])

            # ── Parse JSON ─────────────────────────────────────────────────
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                await _ws_safe_send(websocket, {"type": "error", "message": "Invalid JSON payload"})
                continue

            msg_type = data.get("type", "message")

            # ── Heartbeat ping/pong ────────────────────────────────────────
            if msg_type == "ping":
                await _ws_safe_send(websocket, {"type": "pong"})
                log.info("[ws/chat] Pong sent")
                continue

            # ── Accept: "message", "chat", "ask" ──────────────────────────
            if msg_type not in ("message", "chat", "ask"):
                await _ws_safe_send(websocket, {
                    "type": "error",
                    "message": f"Unknown message type: {msg_type!r}. Use 'message', 'chat', or 'ask'.",
                })
                continue

            # ── Accept flexible question field names ───────────────────────
            query = (
                data.get("question") or
                data.get("query") or
                data.get("message") or
                data.get("content") or
                ""
            ).strip()

            # ── Multi-doc support: accept doc_ids list OR legacy doc_id ──
            doc_ids_raw = data.get("doc_ids")  # preferred: list of collection IDs
            if doc_ids_raw is None:
                single = data.get("doc_id")
                doc_ids = [single] if single else []
            else:
                doc_ids = [d for d in doc_ids_raw if d]  # filter None/empty

            history: list = data.get("history", [])

            if not query:
                await _ws_safe_send(websocket, {"type": "error", "message": "question field is required"})
                continue

            log.info("[ws/chat] Processing — query=%r doc_ids=%s", query[:80], doc_ids)

            # ── Signal stream start ────────────────────────────────────────
            await _ws_safe_send(websocket, {"type": "start"})

            buffer = ""
            citations_data: list = []
            try:
                async for token in rag_pipeline.stream_answer(query, doc_ids or None, history):
                    if token.startswith("__CITATIONS__"):
                        cit_json = token.replace("__CITATIONS__", "")
                        citations_data = json.loads(cit_json)
                        await _ws_safe_send(websocket, {
                            "type": "citation",
                            "data": citations_data,
                        })
                        log.info("[ws/chat] Citation sent")
                    else:
                        buffer += token
                        await _ws_safe_send(websocket, {"type": "token", "content": token})
            except Exception as exc:
                print(f"=> [ws/chat] Stream error: {exc}")
                log.error("[ws/chat] Stream error: %s", exc, exc_info=True)
                await _ws_safe_send(websocket, {"type": "error", "message": str(exc)})

            # ── Save messages to DB if chatId provided ─────────────────────
            if chatId and buffer:
                try:
                    from database.connection import AsyncSessionLocal
                    from sqlalchemy import insert, text as sql_text
                    async with AsyncSessionLocal() as db:
                        await db.execute(
                            sql_text(
                                "INSERT INTO chat_messages (id, chat_id, role, content, created_at) "
                                "VALUES (gen_random_uuid(), :cid, 'user', :content, now())"
                            ),
                            {"cid": chatId, "content": query},
                        )
                        await db.execute(
                            sql_text(
                                "INSERT INTO chat_messages (id, chat_id, role, content, citations, created_at) "
                                "VALUES (gen_random_uuid(), :cid, 'assistant', :content, CAST(:cits AS JSONB), now())"
                            ),
                            {
                                "cid": chatId,
                                "content": buffer,
                                "cits": json.dumps(citations_data),
                            },
                        )
                        await db.commit()
                except Exception as db_err:
                    log.warning("[ws/chat] DB save failed (non-fatal): %s", db_err)

            # ── Award XP and signal done ───────────────────────────────────
            from services.gamification_service import award_xp
            xp_earned: int = award_xp("chat") or 5
            log.info("[ws/chat] Done — chars=%d xp=%d", len(buffer), xp_earned)
            print(f"=> [ws/chat] Done — chars={len(buffer)} xp={xp_earned}")
            await _ws_safe_send(websocket, {"type": "done", "xp_earned": xp_earned})

    except WebSocketDisconnect:
        log.info("[ws/chat] WebSocket disconnected (outer)")
    except Exception as exc:
        log.error("[ws/chat] Unexpected error: %s", exc, exc_info=True)
        await _ws_safe_send(websocket, {
            "type": "error",
            "message": f"Internal server error: {str(exc)}",
        })


# ── /ws/quiz ──────────────────────────────────────────────────────────────────
@router.websocket("/ws/quiz")
async def ws_quiz(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_json()
            topic = data.get("topic", "")
            doc_id = data.get("doc_id")
            n = data.get("n", 10)
            difficulty = data.get("difficulty", "medium")

            await _ws_safe_send(websocket, {"type": "start", "message": "Generating quiz..."})
            from routers.quiz import _parse_quiz_json, QUIZ_PROMPT
            from services import rag_pipeline as rp

            ctx_blocks = []
            if doc_id:
                chunks = await rp.retrieve_context(topic, [doc_id], top_k=6)
                ctx_blocks = [c["text"] for c in chunks]

            prompt = QUIZ_PROMPT.format(n=n, topic=topic, difficulty=difficulty, types="mcq")
            if ctx_blocks:
                prompt = f"Context:\n{chr(10).join(ctx_blocks[:3])}\n\n{prompt}"

            raw = await llm_service.complete(prompt, temperature=0.4)
            questions = _parse_quiz_json(raw, topic)

            import uuid
            quiz_id = str(uuid.uuid4())
            await _ws_safe_send(websocket, {
                "type": "quiz_ready",
                "quiz_id": quiz_id,
                "topic": topic,
                "questions": questions,
            })

    except WebSocketDisconnect:
        pass


# ── /ws/exams ─────────────────────────────────────────────────────────────────
@router.websocket("/ws/exams")
async def ws_exam(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_json()
            exam_id = data.get("exam_id", "cbse-10")
            await _ws_safe_send(websocket, {"type": "start", "message": f"Generating {exam_id} exam..."})

            from routers.exam import EXAM_TEMPLATES, EXAM_QUESTION_PROMPT
            template = next((e for e in EXAM_TEMPLATES if e["exam_id"] == exam_id), None)
            if not template:
                await _ws_safe_send(websocket, {"type": "error", "message": "Exam not found"})
                continue

            all_questions = []
            for section in template["sections"]:
                await _ws_safe_send(websocket, {"type": "progress", "section": section["name"]})
                prompt = EXAM_QUESTION_PROMPT.format(
                    n=data.get("n_per_section", 5),
                    exam_name=template["name"],
                    section=section["name"],
                )
                raw = await llm_service.complete(prompt, temperature=0.4)
                try:
                    start = raw.find("[")
                    end = raw.rfind("]")
                    qs = json.loads(raw[start:end + 1])
                    all_questions.extend(qs)
                except Exception:
                    pass

            import uuid
            await _ws_safe_send(websocket, {
                "type": "exam_ready",
                "run_id": str(uuid.uuid4()),
                "exam_name": template["name"],
                "questions": all_questions,
            })

    except WebSocketDisconnect:
        pass


# ── /ws/podcast ───────────────────────────────────────────────────────────────
@router.websocket("/ws/podcast")
async def ws_podcast(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_json()
            topic = data.get("topic", "")
            doc_id = data.get("doc_id")
            style = data.get("style", "educational")

            await _ws_safe_send(websocket, {"type": "start", "message": "Generating podcast script..."})

            from routers.tools import PODCAST_PROMPT
            context_str = ""
            if doc_id:
                chunks = await rag_pipeline.retrieve_context(topic, [doc_id], top_k=5)
                context_str = "Document context:\n" + "\n---\n".join(c["text"] for c in chunks)

            prompt = PODCAST_PROMPT.format(topic=topic, style=style, duration="medium", context=context_str)

            # Stream the script generation
            script_buffer = ""
            async for token in llm_service.stream_response(prompt):
                script_buffer += token
                await _ws_safe_send(websocket, {"type": "token", "data": token})

            await _ws_safe_send(websocket, {"type": "script_done", "script": script_buffer})

            # Generate audio
            await _ws_safe_send(websocket, {"type": "audio_start"})
            from services import tts_service
            audio_url = await tts_service.generate_podcast_audio(script_buffer)
            await _ws_safe_send(websocket, {"type": "audio_ready", "audio_url": audio_url})

    except WebSocketDisconnect:
        pass


# ── /ws/smartnotes ────────────────────────────────────────────────────────────
@router.websocket("/ws/smartnotes")
async def ws_smartnotes(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_json()
            topic = data.get("topic", "the document")
            doc_id = data.get("doc_id")
            fmt = data.get("format", "bullet")

            context_str = ""
            if doc_id:
                chunks = await rag_pipeline.retrieve_context(topic, [doc_id], top_k=8)
                context_str = "\n---\n".join(c["text"] for c in chunks)

            from routers.tools import SMART_NOTES_PROMPT
            prompt = SMART_NOTES_PROMPT.format(format=fmt, topic=topic, context=context_str)

            await _ws_safe_send(websocket, {"type": "start"})
            async for token in llm_service.stream_response(prompt):
                await _ws_safe_send(websocket, {"type": "token", "data": token})
            await _ws_safe_send(websocket, {"type": "done"})

    except WebSocketDisconnect:
        pass


# ── /ws/planner ───────────────────────────────────────────────────────────────
@router.websocket("/ws/planner")
async def ws_planner(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_json()
            action = data.get("action", "weekly")

            if action == "ingest":
                from services.planner_nlp import parse_task
                text = data.get("text", "")
                parsed = parse_task(text)
                await _ws_safe_send(websocket, {"type": "task_parsed", "task": parsed})

            elif action == "weekly":
                tasks = data.get("tasks", [])
                prompt = (
                    f"Create weekly study schedule for tasks:\n{json.dumps(tasks, indent=2)}\n"
                    "Return JSON schedule."
                )
                await _ws_safe_send(websocket, {"type": "start"})
                async for token in llm_service.stream_response(prompt):
                    await _ws_safe_send(websocket, {"type": "token", "data": token})
                await _ws_safe_send(websocket, {"type": "done"})

            else:
                await _ws_safe_send(websocket, {"type": "error", "message": f"Unknown action: {action}"})

    except WebSocketDisconnect:
        pass


# ── /ws/companion ─────────────────────────────────────────────────────────────
@router.websocket("/ws/companion")
async def ws_companion(websocket: WebSocket):
    """Companion AI — persistent study assistant."""
    await websocket.accept()
    history: list = []
    try:
        while True:
            data = await websocket.receive_json()
            query = data.get("query", "").strip()
            if not query:
                continue

            history.append({"role": "user", "content": query})
            # Keep last 10 turns
            history = history[-20:]

            system = (
                "You are Mentora, a friendly AI study companion. "
                "Help students with their studies, answer questions, and provide encouragement. "
                "Keep responses concise and engaging."
            )
            # Build context string for LLM
            ctx = "\n".join([f"{m['role'].capitalize()}: {m['content']}" for m in history[-8:]])
            prompt = f"Conversation:\n{ctx}\n\nRespond as Mentora:"

            buffer = ""
            async for token in llm_service.stream_response(prompt, system=system):
                buffer += token
                await _ws_safe_send(websocket, {"type": "token", "data": token})
            history.append({"role": "assistant", "content": buffer})
            await _ws_safe_send(websocket, {"type": "done"})

    except WebSocketDisconnect:
        pass
