#!/bin/bash
set -e
echo "🎓 Setting up Mentora AI Backend..."

# ── Ollama ────────────────────────────────────────────────────────────────────
if ! command -v ollama &>/dev/null; then
  echo "📥 Installing Ollama..."
  curl -fsSL https://ollama.com/install.sh | sh
else
  echo "✅ Ollama already installed"
fi

# Start Ollama in background if not running
if ! pgrep -x "ollama" > /dev/null; then
  ollama serve &
  sleep 3
fi

echo "📥 Pulling LLM model: phi4-mini (3.8B)..."
ollama pull phi4-mini

echo "📥 Pulling embedding model: mxbai-embed-large..."
ollama pull mxbai-embed-large

# ── System packages ───────────────────────────────────────────────────────────
echo "📦 Installing system dependencies..."
sudo apt update -qq || true
sudo apt install -y --fix-missing tesseract-ocr redis-server python3-pip ffmpeg libpq-dev python3-venv || \
  sudo apt install -y --fix-missing tesseract-ocr redis-server python3-pip ffmpeg libpq-dev python3-venv

# Start Redis
sudo systemctl enable redis-server 2>/dev/null || true
sudo systemctl start redis-server 2>/dev/null || redis-server --daemonize yes

# ── Python env ────────────────────────────────────────────────────────────────
echo "🐍 Creating Python virtual environment..."
python3 -m venv venv
source venv/bin/activate

echo "📦 Installing Python dependencies..."
pip install --upgrade pip setuptools wheel -q
pip install -r requirements.txt

# ── spaCy model ───────────────────────────────────────────────────────────────
echo "📥 Downloading spaCy English model..."
python -m spacy download en_core_web_sm

# ── Uploads dir ───────────────────────────────────────────────────────────────
mkdir -p uploads chroma_db

# ── Env file ─────────────────────────────────────────────────────────────────
if [ ! -f .env ]; then
  cp .env.example .env
  echo "⚠️  .env created from .env.example — fill in your SUPABASE_URL / DATABASE_URL"
fi

echo ""
echo "✅ Mentora setup complete!"
echo ""
echo "▶  Start backend:  source venv/bin/activate && uvicorn main:app --reload --port 5000"
echo "▶  Start frontend: cd .. && npm run dev"
echo "▶  API docs:       http://localhost:5000/docs"
