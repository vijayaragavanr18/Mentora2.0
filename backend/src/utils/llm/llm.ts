import { makeModels } from './models'

// Singleton pattern with lazy initialization
let llmInstance: any = null
let embeddingsInstance: any = null
let initError: Error | null = null
let isInitializing = false
let initPromise: Promise<void> | null = null

async function initModels() {
  // Return immediately if already initialized
  if (llmInstance && embeddingsInstance) return
  
  // Wait if initialization is in progress
  if (isInitializing && initPromise) {
    await initPromise
    return
  }
  
  // Start initialization
  isInitializing = true
  initPromise = (async () => {
    try {
      console.log('[LLM] Initializing models...')
      const { llm, embeddings } = makeModels()
      llmInstance = llm
      embeddingsInstance = embeddings
      console.log('[LLM] Models initialized successfully')
    } catch (e) {
      initError = e as Error
      console.error('[LLM] Failed to initialize models:', (e as Error).message)
      console.error((e as Error).stack)
      throw e
    } finally {
      isInitializing = false
    }
  })()
  
  await initPromise
}

// Lazy proxy for LLM - only initializes when first method is called
const llmProxy = new Proxy({} as any, {
  get(_target, prop) {
    if (prop === 'invoke' || prop === 'stream' || prop === 'call') {
      return async (...args: any[]) => {
        try {
          await initModels()
          if (!llmInstance) {
            throw new Error('LLM failed to initialize')
          }
          return await llmInstance[prop](...args)
        } catch (error) {
          console.error(`[LLM] Error calling ${String(prop)}:`, error)
          throw error
        }
      }
    }
    // For synchronous properties, initialize synchronously
    if (!llmInstance) {
      throw new Error('LLM not initialized. Call an async method first.')
    }
    return llmInstance[prop]
  }
})

// Lazy proxy for embeddings
const embeddingsProxy = new Proxy({} as any, {
  get(_target, prop) {
    if (prop === 'embedQuery' || prop === 'embedDocuments') {
      return async (...args: any[]) => {
        try {
          await initModels()
          if (!embeddingsInstance) {
            throw new Error('Embeddings failed to initialize')
          }
          return await embeddingsInstance[prop](...args)
        } catch (error) {
          console.error(`[Embeddings] Error calling ${String(prop)}:`, error)
          throw error
        }
      }
    }
    if (!embeddingsInstance) {
      throw new Error('Embeddings not initialized. Call an async method first.')
    }
    return embeddingsInstance[prop]
  }
})

export default llmProxy
export { embeddingsProxy as embeddings }