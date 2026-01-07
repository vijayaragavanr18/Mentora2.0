import path from 'path'

process.loadEnvFile(path.resolve(process.cwd(), '.env'))

export const config = {
  // Database
  db_mode: process.env.db_mode || 'json',
  
  // Server
  port: Number(process.env.PORT || 5000),
  host: process.env.HOST || '0.0.0.0',
  baseUrl: process.env.VITE_BACKEND_URL || 'http://localhost:5000',
  frontendUrl: process.env.VITE_FRONTEND_URL || 'http://localhost:5173',
  timeout: Number(process.env.VITE_TIMEOUT || 90000),
  
  // Ollama (Only LLM Provider)
  ollama: {
    model: process.env.OLLAMA_MODEL || 'llama3.2:3b',
    embedModel: process.env.OLLAMA_EMBED_MODEL || 'nomic-embed-text',
    baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    keepAlive: process.env.OLLAMA_KEEP_ALIVE || '5m',
    numCtx: Number(process.env.OLLAMA_NUM_CTX || 4096),
  },
  
  // LLM Settings
  temp: Number(process.env.LLM_TEMP || 0.7),
  max_tokens: Number(process.env.LLM_MAXTOK || 8192),
  
  // TTS Settings
  tts_provider: process.env.TTS_PROVIDER || 'edge',
  ffmpeg: process.env.FFMPEG_PATH || 'ffmpeg',
  tts_voice_edge: process.env.TTS_VOICE_EDGE || 'en-US-AvaNeural',
  tts_voice_alt_edge: process.env.TTS_VOICE_ALT_EDGE || 'en-US-AndrewNeural',
  
  // Transcription
  transcription_provider: process.env.TRANSCRIPTION_PROVIDER || 'whisper',
}