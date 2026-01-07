# PageLM

**An AI-powered education platform that transforms study materials into interactive learning experiences.**

PageLM converts your documents (PDFs, notes, recordings) into structured learning tools—including quizzes, flashcards, structured notes, and podcasts—running entirely locally or in the cloud. It is designed to be a private, open-source alternative to tools like NotebookLM.

![PageLM Logo](assets/logo.png)

## 🚀 Features

PageLM provides a modern interface for students, educators, and researchers to **enhance learning efficiency**.

### Learning Tools

- **Contextual Chat** – Ask questions about uploaded documents (PDF, DOCX, Markdown, TXT) with citations.
- **SmartNotes** – Generate Cornell-style notes automatically from topics or uploaded content.
- **Flashcards** – Extract non-overlapping flashcards for spaced repetition study.
- **Quizzes** – Create interactive quizzes with hints, explanations, and automatic scoring.
- **AI Podcast** – Convert notes and topics into engaging audio conversations for learning on the go.
- **Voice Transcribe** – Convert lecture recordings and voice notes into searchable text.
- **Homework Planner** – AI-assisted planning to break down assignments and overcome blocks.
- **ExamLab** – Simulate exams with customizable timing and difficulty to prepare for the real thing.
- **Debate** – Practice your argumentation skills against an AI opponent on any topic.
- **Study Companion** – A personalized AI assistant that guides your learning journey.

### Privacy First & Local AI

- **Ollama Integration** – Run powerful LLMs (like Llama 3) entirely offline on your own hardware.
- **Data Privacy** – Your documents and chats stay on your machine (when using local models).
- **Flexible Backends** – While optimized for Ollama, PageLM also supports OpenAI, Gemini, Anthropic, and Grok if you prefer cloud models.

## 💡 Why PageLM?

Unlike general-purpose chat bots, PageLM is built specifically for **structured learning**.

| Feature | PageLM | Standard Chatbots |
| :--- | :--- | :--- |
| **Input** | Upload structured files (PDF, DOCX) & Audio | Mostly plain text / simple uploads |
| **Output** | Structured Notes, Quizzes, Podcasts, Exams | Text paragraphs |
| **Storage** | Project-based "Learning Spaces" | Ephemeral conversations |
| **Privacy** | Local-first (Ollama), Self-hosted | Cloud-only (usually) |

## 🛠️ Technology Stack

| Component | Technology |
| :--- | :--- |
| **Backend** | Node.js, TypeScript, Express, LangChain |
| **Frontend** | React, Vite, TailwindCSS, TypeScript |
| **Database** | Keyv (SQLite/JSON) for lightweight storage |
| **AI/ML** | Ollama (Local), LangChain (Orchestration) |
| **Audio** | Edge TTS, Google Cloud Speech, OpenAI Whisper |

## ⚡ Getting Started

### Prerequisites

- **Node.js** v21+
- **Ollama** (for local AI) - [Download Ollama](https://ollama.com/)
- **FFmpeg** (required for podcast audio processing)

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/vijayaragavanr18/pagelm.git
    cd pagelm
    ```

2.  **Run the setup script** (Installs dependencies for both frontend and backend)
    
    *Linux/Mac:*
    ```bash
    chmod +x setup.sh
    ./setup.sh
    ```

    *Windows:*
    ```powershell
    Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
    .\setup.ps1
    ```

    *Manual:*
    ```bash
    cd backend && npm install
    cd ../frontend && npm install
    ```

3.  **Environment Configuration**
    
    Copy the example environment file:
    ```bash
    # Root directory
    cp .env.example .env
    ```
    
    Edit `.env` to configure your settings. By default, it is set up for **Ollama**.
    Ensure you have the required models pulled:
    ```bash
    ollama pull llama3.2:3b
    ollama pull nomic-embed-text
    ```

### Running the App

You need to run the backend and frontend in separate terminals.

**Terminal 1 (Backend):**
```bash
cd backend
npm run dev
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm run dev
```

👉 **Open your browser at:** [http://localhost:5173](http://localhost:5173)

## 🐳 Docker Deployment

For a production-ready or simplified containerized setup, check out the [Deployment Guide](DEPLOYMENT.md).

```bash
docker compose up --build
```

## ⚙️ Configuration

All configuration is handled via environment variables in `.env`:

- `LLM_PROVIDER`: `ollama` (default), `openai`, `gemini`, etc.
- `OLLAMA_BASE_URL`: URL for your local Ollama instance.
- `TTS_PROVIDER`: Service for generating podcast audio.

See `.env.example` for a full list of options.

## 🤝 Contributing

Contributions are welcome!
- **AI model integrations**
- **Mobile app support**
- **Performance improvements**
- **Accessibility features**

## 📄 License

This project is licensed under the terms found in the [LICENSE](LICENSE.md) file.