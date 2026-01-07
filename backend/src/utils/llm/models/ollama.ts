import { ChatOllama, OllamaEmbeddings } from '@langchain/ollama'
import { wrapChat } from './util'
import type { MkLLM, MkEmb, EmbeddingsLike } from './types'

/**
 * Creates a ChatOllama instance with optimized settings for deployment
 */
export const makeLLM: MkLLM = (cfg: any) => {
  console.log('[Ollama LLM] Creating chat model instance...')
  
  const m = new ChatOllama({
    model: cfg.ollama?.model || 'llama3.2:3b',
    baseUrl: cfg.ollama?.baseUrl || 'http://localhost:11434',
    temperature: cfg.temp ?? 0.7,
    numCtx: cfg.ollama?.numCtx || 4096,
    numPredict: cfg.max_tokens || 2048,
    keepAlive: cfg.ollama?.keepAlive || '5m',
  })
  
  console.log('[Ollama LLM] Chat model created successfully')
  return wrapChat(m)
}

/**
 * Creates an OllamaEmbeddings instance for vector operations
 */
export const makeEmbeddings: MkEmb = (cfg: any): EmbeddingsLike => {
  console.log('[Ollama Embeddings] Creating embeddings instance...')
  
  const embeddings = new OllamaEmbeddings({
    model: cfg.ollama?.embedModel || 'nomic-embed-text',
    baseUrl: cfg.ollama?.baseUrl || 'http://localhost:11434',
    keepAlive: cfg.ollama?.keepAlive || '5m',
  })
  
  console.log('[Ollama Embeddings] Embeddings created successfully')
  return embeddings
}