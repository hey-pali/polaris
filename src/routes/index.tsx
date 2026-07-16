import { useEffect, useRef, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { ArrowUp, Square } from 'lucide-react'
import { Streamdown } from 'streamdown'

import { useAIChat } from '@/lib/ai-hook'
import type { ChatMessages } from '@/lib/ai-hook'

function PolarisAvatar({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const dimensions = size === 'sm' ? 'w-9 h-9' : 'w-11 h-11'
  return (
    <div
      className={`${dimensions} rounded-full flex items-center justify-center flex-shrink-0`}
      style={{
        background: '#47586A',
        boxShadow: '0 0 0 1px rgba(71,88,106,0.35), 0 2px 10px rgba(71,88,106,0.25)',
      }}
    >
      <img src="/polaris-logo.png" alt="Polaris" className="w-2/3 h-2/3 object-contain" />
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 px-4 pb-2 polaris-rise">
      <PolarisAvatar size="sm" />
      <div className="polaris-bubble-in rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5" />
    </div>
  )
}

function Messages({
  messages,
  isLoading,
}: {
  messages: ChatMessages
  isLoading: boolean
}) {
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop =
        messagesContainerRef.current.scrollHeight
    }
  }, [messages, isLoading])

  const lastMessage = messages[messages.length - 1]
  const showTyping = isLoading && lastMessage?.role !== 'assistant'

  return (
    <div
      ref={messagesContainerRef}
      className="flex-1 overflow-y-auto min-h-0 polaris-scroll py-4"
    >
      <div className="max-w-2xl mx-auto w-full flex flex-col gap-3 px-3 sm:px-4">
        {messages.map((message) => {
          const isUser = message.role === 'user'
          return (
            <div
              key={message.id}
              className={`flex items-end gap-2 polaris-rise ${
                isUser ? 'flex-row-reverse' : 'flex-row'
              }`}
            >
              {!isUser && <PolarisAvatar size="sm" />}
              <div
                className={`max-w-[78%] sm:max-w-[65%] rounded-2xl px-4 py-2.5 text-[0.95rem] leading-relaxed shadow-sm ${
                  isUser
                    ? 'polaris-bubble-out rounded-br-sm'
                    : 'polaris-bubble-in rounded-bl-sm'
                }`}
              >
                {message.parts.map((part, index) => {
                  if (part.type === 'text' && part.content) {
                    return (
                      <div className="polaris-prose" key={index}>
                        <Streamdown>{part.content}</Streamdown>
                      </div>
                    )
                  }
                  return null
                })}
              </div>
            </div>
          )
        })}
      </div>
      {showTyping && <div className="max-w-2xl mx-auto w-full">{<TypingIndicator />}</div>}
    </div>
  )
}

function ChatHeader() {
  return (
    <header
      className="flex items-center gap-3 px-4 py-3 border-b flex-shrink-0"
      style={{
        background: 'var(--polaris-panel)',
        borderColor: 'var(--polaris-line)',
      }}
    >
      <PolarisAvatar />
      <div className="min-w-0">
        <h1 className="font-display font-semibold text-[1.05rem] leading-tight text-[var(--polaris-ink)] truncate">
          Polaris
        </h1>
        <p className="text-xs text-[var(--polaris-ink-dim)] truncate">
          Guia da Comunidade Supernova · online
        </p>
      </div>
    </header>
  )
}

function EmptyState({ onPrompt }: { onPrompt: (text: string) => void }) {
  const starters = [
    'Acabei de entrar na Supernova, por onde eu começo?',
    'Qual é o próximo passo da minha jornada?',
    'Estou meio perdido, pode me orientar?',
  ]

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 polaris-scroll">
      <div className="max-w-md w-full text-center polaris-rise">
        <div className="mx-auto mb-5 w-16 h-16">
          <PolarisAvatar size="md" />
        </div>
        <h2 className="font-display text-2xl font-semibold text-[#47586A] mb-2">
          Oi, eu sou a Polaris
        </h2>
        <p className="text-sm text-[#47586A]/70 mb-6">
          Sua guia dentro da Comunidade Supernova. Manda uma mensagem e eu te
          ajudo a encontrar o próximo passo da sua jornada.
        </p>
        <div className="flex flex-col gap-2">
          {starters.map((s) => (
            <button
              key={s}
              onClick={() => onPrompt(s)}
              className="text-left text-sm px-4 py-3 rounded-xl border transition-colors"
              style={{
                borderColor: 'var(--polaris-line)',
                background: 'var(--polaris-panel)',
                color: 'var(--polaris-ink)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--polaris-gold-deep)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--polaris-line)'
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function ErrorBanner({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="max-w-2xl mx-auto w-full px-3 sm:px-4 pt-3 polaris-rise">
      <div
        className="flex items-center justify-between gap-3 rounded-xl border px-4 py-2.5 text-sm"
        style={{
          borderColor: 'var(--polaris-line)',
          background: 'var(--polaris-panel)',
          color: 'var(--polaris-ink-dim)',
        }}
      >
        <span>Tive um probleminha de conexão agora.</span>
        <button
          onClick={onRetry}
          className="text-xs font-medium underline flex-shrink-0"
          style={{ color: 'var(--polaris-gold)' }}
        >
          Tentar de novo
        </button>
      </div>
    </div>
  )
}

function Home() {
  const [input, setInput] = useState('')
  const { messages, sendMessage, isLoading, stop, error, reload } = useAIChat()

  const submit = (text: string) => {
    if (text.trim()) {
      sendMessage(text)
      setInput('')
    }
  }

  return (
    <div
      className="relative flex flex-col h-[calc(100vh-0px)]"
      style={{ background: 'var(--polaris-charcoal)' }}
    >
      <ChatHeader />

      {messages.length === 0 ? (
        <EmptyState onPrompt={submit} />
      ) : (
        <Messages messages={messages} isLoading={isLoading} />
      )}

      <div
        className="flex-shrink-0 border-t"
        style={{
          background: 'var(--polaris-panel)',
          borderColor: 'var(--polaris-line)',
        }}
      >
        {error && !isLoading && <ErrorBanner onRetry={() => reload()} />}
        <div className="max-w-2xl mx-auto w-full px-3 sm:px-4 py-3">
          {isLoading && (
            <div className="flex items-center justify-center mb-2">
              <button
                onClick={stop}
                className="px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 border"
                style={{
                  borderColor: 'var(--polaris-line)',
                  color: 'var(--polaris-ink-dim)',
                }}
              >
                <Square className="w-3 h-3 fill-current" />
                Parar
              </button>
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              submit(input)
            }}
          >
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Escreva para a Polaris..."
                className="flex-1 rounded-full px-4 py-2.5 text-sm focus:outline-none border"
                style={{
                  background: 'var(--polaris-bubble-in)',
                  borderColor: '#FFF8EC',
                  color: 'var(--polaris-ink)',
                }}
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                aria-label="Enviar mensagem"
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 disabled:opacity-40 transition-transform active:scale-95"
                style={{
                  background: '#FFF8EC',
                  color: '#47586A',
                }}
              >
                <ArrowUp className="w-5 h-5" strokeWidth={2.5} />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export const Route = createFileRoute('/')({
  component: Home,
})
