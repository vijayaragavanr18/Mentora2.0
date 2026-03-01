from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import os

from routers import auth, upload, chat, quiz, debate, exam, planner, flashcards, tools, gamification, websocket
from database.connection import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle."""
    os.makedirs("uploads", exist_ok=True)
    os.makedirs("chroma_db", exist_ok=True)
    await init_db()
    yield


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
app.include_router(tools.router)         # /podcast, /smartnotes, /transcriber
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
