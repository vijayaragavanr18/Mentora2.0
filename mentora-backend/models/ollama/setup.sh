#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# Mentora — Ollama Model Setup
# Configures OLLAMA_MODELS to store weights inside this project directory,
# then pulls all required models.
# ──────────────────────────────────────────────────────────────────────────────
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MODELS_DIR="$SCRIPT_DIR"   # = mentora-backend/models/ollama/
ENV_FILE="$(dirname "$(dirname "$SCRIPT_DIR")")/.env"

echo "==> Mentora Ollama setup"
echo "    Models directory : $MODELS_DIR"
echo "    .env file        : $ENV_FILE"
echo ""

# ── 1. Write / update OLLAMA_MODELS in .env ───────────────────────────────────
if [ -f "$ENV_FILE" ]; then
    if grep -q "^OLLAMA_MODELS=" "$ENV_FILE"; then
        sed -i "s|^OLLAMA_MODELS=.*|OLLAMA_MODELS=$MODELS_DIR|" "$ENV_FILE"
    else
        echo "OLLAMA_MODELS=$MODELS_DIR" >> "$ENV_FILE"
    fi
else
    echo "OLLAMA_MODELS=$MODELS_DIR" > "$ENV_FILE"
fi
echo "✓ OLLAMA_MODELS set to $MODELS_DIR in .env"

# ── 2. Migrate existing Ollama models into project directory ──────────────────
SYSTEM_OLLAMA_DIR="/usr/share/ollama/.ollama/models"
if [ -d "$SYSTEM_OLLAMA_DIR" ] && [ "$(ls -A "$SYSTEM_OLLAMA_DIR" 2>/dev/null)" ]; then
    echo ""
    echo "==> Migrating existing models from $SYSTEM_OLLAMA_DIR ..."
    rsync -av --progress "$SYSTEM_OLLAMA_DIR/" "$MODELS_DIR/" || {
        echo "rsync failed — trying cp ..."
        cp -rv "$SYSTEM_OLLAMA_DIR/." "$MODELS_DIR/"
    }
    echo "✓ Models migrated"
else
    echo "   (No existing models found at $SYSTEM_OLLAMA_DIR, skipping migration)"
fi

# ── 3. Pull all required models with OLLAMA_MODELS overridden ─────────────────
echo ""
echo "==> Pulling required models ..."

export OLLAMA_MODELS="$MODELS_DIR"

ollama pull phi4-mini && echo "✓ phi4-mini ready"
ollama pull mxbai-embed-large && echo "✓ mxbai-embed-large ready"

echo ""
echo "✅ All Ollama models are ready in: $MODELS_DIR"
echo ""
echo "   Add this to your shell or systemd service:"
echo "   export OLLAMA_MODELS=$MODELS_DIR"
