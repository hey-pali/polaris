import { useEffect, useRef } from 'react'
import {
  fetchServerSentEvents,
  useChat,
  createChatClientOptions,
} from '@tanstack/ai-react'
import type { InferChatMessages } from '@tanstack/ai-react'

// Default chat options for simple usage
const defaultChatOptions = createChatClientOptions({
  connection: fetchServerSentEvents('/api/chat'),
})

export type ChatMessages = InferChatMessages<typeof defaultChatOptions>

export const useAIChat = () => {
  const chatOptions = createChatClientOptions({
    connection: fetchServerSentEvents('/api/chat'),
  })

  const chat = useChat(chatOptions)
  const hasAutoRetriedRef = useRef(false)

  // The Anthropic connection occasionally throws a transient "Connection
  // error" (Netlify AI Gateway flakiness). Retry once automatically before
  // bothering the member with an error message.
  useEffect(() => {
    if (chat.error && !hasAutoRetriedRef.current) {
      hasAutoRetriedRef.current = true
      chat.reload()
    } else if (!chat.error) {
      hasAutoRetriedRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat.error])

  return chat
}
