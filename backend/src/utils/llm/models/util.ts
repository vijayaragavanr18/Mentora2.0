import type { Msg } from './types'

export const wrapChat = (m: any) => ({
  invoke: async (ms: Msg[]) => {
    console.log('[LLM wrapChat] invoke called with', ms.length, 'messages')
    try {
      const result = await m.invoke(ms)
      console.log('[LLM wrapChat] invoke succeeded, result type:', typeof result)
      return result
    } catch (e: any) {
      console.error('[LLM wrapChat] invoke FAILED:', e?.message || e)
      console.error('[LLM wrapChat] stack:', e?.stack)
      throw e
    }
  },
  call: async (ms: Msg[]) => {
    console.log('[LLM wrapChat] call called with', ms.length, 'messages')
    try {
      const result = await m.invoke(ms)
      console.log('[LLM wrapChat] call succeeded, result type:', typeof result)
      return result
    } catch (e: any) {
      console.error('[LLM wrapChat] call FAILED:', e?.message || e)
      console.error('[LLM wrapChat] stack:', e?.stack)
      throw e
    }
  },
})