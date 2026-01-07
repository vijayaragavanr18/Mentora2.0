// Test script to verify Ollama connectivity
import { ChatOllama, OllamaEmbeddings } from '@langchain/ollama'

async function testOllama() {
  console.log('=== Testing Ollama Connectivity ===\n')
  
  try {
    // Test LLM
    console.log('1. Testing LLM (llama3.2:3b)...')
    const llm = new ChatOllama({
      model: 'llama3.2:3b',
      baseUrl: 'http://localhost:11434',
      temperature: 0.7,
      numCtx: 2048,
      keepAlive: '5m',
    })
    
    const response = await llm.invoke('Say "Hello World" in one sentence.')
    console.log('✓ LLM Response:', response.content)
    console.log()
    
    // Test Embeddings
    console.log('2. Testing Embeddings (nomic-embed-text)...')
    const embeddings = new OllamaEmbeddings({
      model: 'nomic-embed-text',
      baseUrl: 'http://localhost:11434',
      keepAlive: '5m',
    })
    
    const embedding = await embeddings.embedQuery('test')
    console.log('✓ Embedding created, dimensions:', embedding.length)
    console.log()
    
    console.log('=== All Tests Passed! ===')
    process.exit(0)
  } catch (error) {
    console.error('✗ Test failed:', error)
    process.exit(1)
  }
}

testOllama()
