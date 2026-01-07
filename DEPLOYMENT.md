# PageLM Deployment Guide - Ollama Only

## Overview
PageLM is now configured exclusively for **Ollama** deployment - a fast, local LLM provider that runs completely offline.

## Prerequisites

### 1. Install Ollama
- **Windows/Mac/Linux**: Download from [ollama.ai](https://ollama.ai/)
- Verify installation:
  ```bash
  ollama --version
  ```

### 2. Pull Required Models
```bash
# Main chat model (choose based on your hardware)
ollama pull llama3.2:3b    # Recommended: Fast, 2GB RAM
# ollama pull llama3.2:1b  # Smallest: Ultra-fast, 1GB RAM
# ollama pull llama3.1     # Larger: Better quality, 4GB RAM

# Embedding model (required for vector search)
ollama pull nomic-embed-text
```

### 3. Verify Ollama is Running
```bash
# Check if Ollama is accessible
curl http://localhost:11434

# Test model
ollama run llama3.2:3b "Hello, how are you?"
```

## Installation

### Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment:**
   ```bash
   # Copy the Ollama environment file
   cp env.ollama .env
   
   # Or for production
   cp ../.env.production .env
   ```

4. **Customize `.env` (optional):**
   ```env
   # Change model based on your hardware
   OLLAMA_MODEL=llama3.2:3b  # or llama3.2:1b, llama3.1, etc.
   
   # Adjust context window
   OLLAMA_NUM_CTX=4096  # 2048, 4096, 8192
   
   # Keep alive duration
   OLLAMA_KEEP_ALIVE=5m  # 5m, 10m, 30m, 1h
   ```

5. **Start backend:**
   ```bash
   # Development mode with auto-reload
   npm run dev
   
   # Production mode
   npm start
   ```

### Frontend Setup

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start frontend:**
   ```bash
   npm run dev
   ```

4. **Access application:**
   - Open browser: http://localhost:5173

## Docker Deployment

### Using Docker Compose (Recommended)

The `docker-compose.yml` is pre-configured for Ollama:

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Manual Docker Setup

**Backend:**
```bash
cd backend
docker build -t pagelm-backend .
docker run -p 5000:5000 --env-file .env pagelm-backend
```

**Frontend:**
```bash
cd frontend
docker build -t pagelm-frontend .
docker run -p 5173:5173 pagelm-frontend
```

## Model Selection Guide

### Hardware Requirements

| Model | RAM | Speed | Quality | Use Case |
|-------|-----|-------|---------|----------|
| llama3.2:1b | ~1GB | ⚡⚡⚡ | ⭐⭐ | Low-end hardware, quick responses |
| llama3.2:3b | ~2GB | ⚡⚡ | ⭐⭐⭐ | **Recommended** - Best balance |
| llama3.1:7b | ~4GB | ⚡ | ⭐⭐⭐⭐ | Better reasoning, more context |
| llama3.1:70b | ~40GB | 🐢 | ⭐⭐⭐⭐⭐ | Production servers, best quality |

### Model Commands

```bash
# List installed models
ollama list

# Pull a new model
ollama pull llama3.1

# Remove a model
ollama rm llama3.2:1b

# Update model in .env
OLLAMA_MODEL=llama3.1
```

## Configuration Reference

### Environment Variables

**Server:**
- `HOST`: Server bind address (default: `0.0.0.0`)
- `PORT`: Backend port (default: `5000`)
- `VITE_BACKEND_URL`: Backend URL for frontend
- `VITE_FRONTEND_URL`: Frontend URL

**Ollama:**
- `OLLAMA_BASE_URL`: Ollama server URL (default: `http://localhost:11434`)
- `OLLAMA_MODEL`: Chat model name
- `OLLAMA_EMBED_MODEL`: Embedding model name
- `OLLAMA_NUM_CTX`: Context window size (tokens)
- `OLLAMA_KEEP_ALIVE`: Model keep-alive duration

**LLM Parameters:**
- `LLM_TEMP`: Temperature (0.0-1.0, default: `0.7`)
- `LLM_MAXTOK`: Max output tokens (default: `8192`)

**Features:**
- `TTS_PROVIDER`: Text-to-speech provider (default: `edge`)
- `TRANSCRIPTION_PROVIDER`: Audio transcription (default: `whisper`)
- `db_mode`: Database mode (`json` or `sqlite`)

## Troubleshooting

### Ollama Connection Issues

**Problem:** `Cannot connect to Ollama`
```bash
# Check if Ollama is running
curl http://localhost:11434

# Start Ollama service
ollama serve

# Check Docker network (if using Docker)
docker network inspect pagelm_default
```

### Model Not Found

**Problem:** `Model not available`
```bash
# List available models
ollama list

# Pull missing model
ollama pull llama3.2:3b
ollama pull nomic-embed-text
```

### Memory Issues

**Problem:** `Out of memory` or slow responses
```bash
# Switch to smaller model
ollama pull llama3.2:1b

# Update .env
OLLAMA_MODEL=llama3.2:1b
OLLAMA_NUM_CTX=2048

# Restart backend
npm run dev
```

### Port Conflicts

**Problem:** `Port already in use`
```bash
# Change ports in .env
PORT=5001
VITE_BACKEND_URL=http://localhost:5001

# Or kill existing process
# Windows:
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Linux/Mac:
lsof -ti:5000 | xargs kill -9
```

## Performance Optimization

### 1. Model Selection
- Use `llama3.2:1b` for fastest responses
- Use `llama3.2:3b` for balanced performance
- Use larger models only if you have sufficient RAM

### 2. Context Window
- Reduce `OLLAMA_NUM_CTX` for faster inference
- Increase for longer conversations

### 3. Keep Alive
- Set `OLLAMA_KEEP_ALIVE=30m` for production
- Set `OLLAMA_KEEP_ALIVE=5m` for development

### 4. Hardware
- **CPU**: Modern multi-core processor recommended
- **RAM**: 4GB minimum, 8GB+ recommended
- **GPU**: NVIDIA GPU with CUDA for faster inference (optional)

## Monitoring

### Health Check
```bash
# Check backend health
curl http://localhost:5000/health

# Expected response:
# {"status":"ok","provider":"ollama","timestamp":1704567890123}
```

### Logs
```bash
# Backend logs (development)
npm run dev

# Docker logs
docker-compose logs -f backend

# Check Ollama logs
ollama logs
```

## Production Deployment

### Recommended Setup

1. **Use environment-specific configs:**
   ```bash
   cp .env.production .env
   # Edit production values
   ```

2. **Build for production:**
   ```bash
   # Backend
   cd backend
   npm run build
   npm start

   # Frontend
   cd frontend
   npm run build
   ```

3. **Use process manager:**
   ```bash
   # PM2 example
   npm install -g pm2
   pm2 start npm --name "pagelm-backend" -- start
   pm2 save
   pm2 startup
   ```

4. **Set up reverse proxy:**
   - Use Nginx or Apache
   - Configure SSL certificates
   - Set up domain routing

### Security Checklist

- [ ] Change default ports
- [ ] Enable HTTPS/SSL
- [ ] Configure CORS properly
- [ ] Set up firewall rules
- [ ] Use environment secrets management
- [ ] Enable rate limiting
- [ ] Set up monitoring/alerts
- [ ] Regular backups of chat data

## Support

For issues or questions:
1. Check logs for error messages
2. Verify Ollama is running and models are pulled
3. Review configuration in `.env` file
4. Check GitHub issues for similar problems

## Next Steps

1. Customize system prompts in [backend/src/lib/ai/ask.ts](backend/src/lib/ai/ask.ts)
2. Adjust chat settings in [backend/src/core/routes/chat.ts](backend/src/core/routes/chat.ts)
3. Configure frontend in [frontend/src/config/env.ts](frontend/src/config/env.ts)
4. Explore advanced features (debate, quiz, planner, etc.)

---

**PageLM is now optimized for Ollama-only deployment! 🚀**
