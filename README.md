# 🎓 Mentora (PageLM) — AI-Powered Learning Platform

An open-source AI learning assistant built with **FastAPI + Next.js**. Upload your study material and let Mentora teach you through chat, quizzes, flashcards, debates, exams, and more — all powered by a local LLM via Ollama (no API keys needed).

---

## ✨ Features

| Feature | Description |
|---|---|
| 💬 **AI Chat** | Stream real-time answers from your documents via WebSocket |
| 📝 **Quiz Generator** | Auto-generate MCQ quizzes from uploaded files |
| 🃏 **Flash Cards** | Create and review flashcards from your notes |
| ⚔️ **Debate Mode** | AI takes opposing sides to sharpen your arguments |
| 🧪 **Exam Lab** | Full mock exam experience with scoring |
| 📅 **Planner** | NLP-powered task planner with mindmap visualization |
| 🎙️ **Podcast Generator** | Convert notes into audio podcast (Coqui TTS) |
| 📄 **Smart Notes** | Summarize documents into structured notes |
| 🔊 **Transcriber** | Transcribe audio files using faster-whisper |
| 🏆 **Gamification** | XP, levels, and badges as you learn |

---

## 🛠️ Tech Stack

### Backend
- **FastAPI** — REST API + WebSocket streaming
- **Ollama** — Local LLM (`phi4-mini`) + embeddings (`mxbai-embed-large`)
- **ChromaDB** — Vector store for RAG (retrieval-augmented generation)
- **PostgreSQL** — User data, chats, quizzes, tasks
- **Redis** — Response caching
- **spaCy + dateparser** — NLP for planner
- **faster-whisper** — Audio transcription (Python 3.12 compatible)
- **Coqui TTS** — Text-to-speech for podcast generation (Python ≤ 3.11)

### Frontend
- **Next.js 16** (App Router + Turbopack)
- **TypeScript 5** + **React 19**
- **Tailwind CSS 4**
- **d3-force** — Planner mindmap
- **react-markdown** + KaTeX + highlight.js — Rich AI responses

---

## 🚀 Quick Start

### Prerequisites

- Python 3.10 – 3.12
- Node.js 18+
- PostgreSQL running locally
- [Ollama](https://ollama.com) (auto-installed by setup script)
- `tesseract-ocr`, `ffmpeg`, `redis-server` (auto-installed by setup script on Ubuntu/Debian)

---

### 1. Clone the repo

```bash
git clone https://github.com/vijayaragavanr18/pagelm.git
cd pagelm
```

---

### 2. Set up the backend

```bash
cd mentora-backend
bash setup.sh
```

This will:
- Install Ollama and pull `phi4-mini` + `mxbai-embed-large`
- Install system packages (`tesseract-ocr`, `ffmpeg`, `redis-server`, etc.)
- Create a Python virtual environment
- Install all Python dependencies from `requirements.txt` (including the spaCy model)
- Create `.env` from `.env.example`

Then edit `.env` with your database credentials:

```env
DATABASE_URL=postgresql://mentora_user:mentora_pass@localhost:5432/mentora
SECRET_KEY=your-random-64-char-string
FRONTEND_URL=http://localhost:3000
```

---

### 3. Set up the frontend

```bash
cd ../mentora-frontend
npm install
```

---

### 4. Run both servers at once

```bash
cd mentora-frontend
npm run dev
```

This starts:
- **Backend** → http://localhost:5000 (FastAPI)
- **Frontend** → http://localhost:3000 (Next.js)

Or run them separately:

```bash
npm run dev:frontend   # Next.js only
npm run dev:backend    # FastAPI only
```

---

## 📁 Project Structure

```
pagelm/
├── mentora-backend/
│   ├── main.py                 # FastAPI app entry point
│   ├── config.py               # Settings (pydantic-settings)
│   ├── requirements.txt        # All Python dependencies
│   ├── setup.sh                # One-command setup script
│   ├── routers/                # API route handlers
│   ├── services/               # Business logic (RAG, TTS, transcription…)
│   ├── models/                 # SQLAlchemy ORM models
│   ├── database/               # DB connection + schema
│   └── uploads/                # Uploaded files (git-ignored)
├── mentora-frontend/
│   ├── app/                    # Next.js App Router pages
│   ├── src/
│   │   ├── views/              # Full-page view components
│   │   ├── components/         # Reusable UI components
│   │   └── lib/api.ts          # All backend API calls
│   └── package.json
└── nginx.conf                  # Reverse proxy config (optional)
```

---

## 🔌 API Overview

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register a new user |
| `POST` | `/api/auth/login` | Login and get JWT token |
| `POST` | `/api/upload` | Upload a document for RAG |
| `GET` | `/api/documents` | List uploaded documents |
| `WS` | `/ws/chat` | Streaming AI chat (WebSocket) |
| `POST` | `/quiz` | Generate quiz from a document |
| `POST` | `/debate/start` | Start a debate session |
| `POST` | `/exams` | Generate a mock exam |
| `POST` | `/flashcards` | Generate flashcards |
| `POST` | `/smartnotes` | Generate smart notes |
| `POST` | `/podcast` | Generate podcast audio |
| `POST` | `/transcriber` | Transcribe audio file |
| `GET` | `/api/gamification/stats` | Get XP / level / badges |
| `GET` | `/health` | Health check |

---

## ⚙️ Environment Variables

All settings live in `mentora-backend/.env`:

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql://...@localhost/mentora` | PostgreSQL connection string |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection string |
| `SECRET_KEY` | `change-me` | JWT signing secret |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama API URL |
| `LLM_MODEL` | `phi4-mini` | Ollama LLM model name |
| `EMBED_MODEL` | `mxbai-embed-large` | Ollama embedding model name |
| `FRONTEND_URL` | `http://localhost:3000` | Allowed CORS origin |
| `MAX_FILE_SIZE_MB` | `500` | Max upload size |

---

## 📦 Supported File Types

PDF, DOCX, DOC, PPTX, PPT, XLSX, XLS, CSV, TXT, MD, HTML, XML, RTF, EPUB, PNG, JPG, JPEG (OCR)

---

## 🤝 Contributing

Pull requests are welcome! Please open an issue first to discuss what you'd like to change.

---

## 📄 License

MIT
