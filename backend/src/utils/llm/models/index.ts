import * as ollama from './ollama'
import { config } from '../../../config/env'
import type { EmbeddingsLike, LLM } from './types'

type Pair = { llm: LLM; embeddings: EmbeddingsLike }

/**
 * Creates LLM and embeddings instances using Ollama
 * This is the only supported provider for deployment
 */
export function makeModels(): Pair {
  console.log('[LLM Factory] Initializing Ollama models...')
  console.log(`[LLM Factory] Model: ${config.ollama.model}`)
  console.log(`[LLM Factory] Embed Model: ${config.ollama.embedModel}`)
  console.log(`[LLM Factory] Base URL: ${config.ollama.baseUrl}`)
  
  const llm = ollama.makeLLM(config)
  const embeddings = ollama.makeEmbeddings(config)
  
  console.log('[LLM Factory] Ollama models initialized successfully')
  return { llm, embeddings }
}