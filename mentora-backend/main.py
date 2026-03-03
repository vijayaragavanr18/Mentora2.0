from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import os
import logging

# ── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s — %(message)s",
    datefmt="%H:%M:%S",
)
# Silence noisy third-party loggers
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("chromadb").setLevel(logging.WARNING)
logging.getLogger("urllib3").setLevel(logging.WARNING)
logging.getLogger("multipart").setLevel(logging.WARNING)
# ─────────────────────────────────────────────────────────────────────────────

from routers import auth, upload, chat, quiz, debate, exam, planner, flashcards, tools, gamification, websocket
from database.connection import init_db

logger = logging.getLogger("mentora.startup")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle."""
    os.makedirs("uploads", exist_ok=True)
    os.makedirs("chroma_db", exist_ok=True)
    await init_db()
    # Re-queue any docs that were stuck in "processing" from a previous run
    await _restart_stuck_docs()
    yield


async def _restart_stuck_docs():
    """Docs left in 'processing' state after a server restart get re-ingested."""
    from sqlalchemy import select, update as sql_update
    from database.connection import AsyncSessionLocal
    from models.document import DocumentORM
    from routers.upload import _ingest_and_update
    from config import get_settings as _settings
    import asyncio

    cfg = _settings()
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(DocumentORM).where(DocumentORM.status == "processing")
        )
        stuck = result.scalars().all()
        if not stuck:
            return
        logger.info("🔄 [STARTUP] Found %d stuck processing docs — re-queuing", len(stuck))
        for doc in stuck:
            file_path = os.path.join(cfg.upload_dir, doc.filename)
            if not os.path.exists(file_path):
                # File gone — mark failed
                await db.execute(
                    sql_update(DocumentORM)
                    .where(DocumentORM.id == doc.id)
                    .values(status="failed")
                )
                logger.warning("⚠️  [STARTUP] File missing for doc %s — marked failed", doc.id)
            else:
                chroma_id = doc.chroma_collection_id or f"doc_{doc.id}"
                metadata = {"original_name": doc.original_name}
                asyncio.create_task(
                    _ingest_and_update(file_path, chroma_id, str(doc.id), metadata)
                )
                logger.info("⏩ [STARTUP] Re-queued ingest for '%s'", doc.original_name)
        await db.commit()



app = FastAPI(
    title="Mentora API",
    version="1.0.0",
    description="AI-powered learning backend — phi4-mini + LlamaIndex + ChromaDB",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────────────
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_url, "http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3000", "http://localhost:80", "http://127.0.0.1:80"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
# Routers with their own prefix defined internally
app.include_router(auth.router)          # /api/auth/*
app.include_router(upload.router)        # /api/upload, /api/documents
app.include_router(gamification.router)  # /api/gamification/*
# Routers with no internal prefix
app.include_router(chat.router)          # /chat, /chats
app.include_router(quiz.router)          # /quiz
app.include_router(debate.router)        # /debate/*
app.include_router(exam.router)          # /exams, /exam
app.include_router(planner.router)       # /tasks, /planner/*
app.include_router(flashcards.router)    # /flashcards
app.include_router(tools.router)         # /podcast, /smartnotes, /transcriber, /generatetranscriber
app.include_router(websocket.router, prefix="")

# ── Static files ──────────────────────────────────────────────────────────────
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


# ── Health ────────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "Mentora backend running ✅", "version": "1.0.0"}


@app.get("/")
def root():
    return {"message": "Mentora API — docs at /docs"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=5000, reload=True)
