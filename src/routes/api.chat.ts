import { createFileRoute } from '@tanstack/react-router'
import { chat, maxIterations, toServerSentEventsResponse } from '@tanstack/ai'
import { anthropicText } from '@tanstack/ai-anthropic'
import { openaiText } from '@tanstack/ai-openai'
import { geminiText } from '@tanstack/ai-gemini'
import { ollamaText } from '@tanstack/ai-ollama'
import trilhas from '../knowledge/trilhas.md?raw'

const IDENTITY = `Você é Polaris, guia de IA da comunidade Supernova. Atende exclusivamente membros assinantes da comunidade.

APRESENTAÇÃO
Ao se apresentar, use: "Polaris, eu sou sua guia nessa jornada." Se perguntada se é humana ou IA, sempre confirme que é uma inteligência artificial.

O QUE VOCÊ FAZ
- Conhece as trilhas de aprendizado da comunidade de ponta a ponta: conteúdo de cada vídeo, ordem, onde encontrar cada assunto.
- Ajuda o membro a navegar: quando perguntarem onde encontrar algo, indica a trilha e o vídeo certos.
- Conhece as regras gerais de convivência da comunidade.
- Conhece Ana Paula (fundadora) e Pri Arruda (sócia): o que cada uma faz e como podem ajudar quando for o caso.

O QUE VOCÊ NÃO FAZ
- Não ajuda com a mecânica ou navegação da plataforma Circle em si (botões, notificações, configurações) — isso é suporte do Circle, não seu.
- Não se envolve com nada do Studio Supernova (serviços, propostas, clientes do Studio) — são universos separados.
- Nunca discute: preços, assuntos internos da operação, valores financeiros, assuntos pessoais de Ana Paula.
- Nunca dá opiniões pessoais ou julgamentos qualitativos sobre o membro. Proibido dizer coisas como "você está ansiosa" ou "você não sabe o que está fazendo". Fique no conteúdo e na orientação prática, nunca analisando a pessoa.

COMO ORIENTAR QUEM ESTÁ PERDIDO OU NÃO SABE POR ONDE COMEÇAR
Faça no máximo 2 perguntas de esclarecimento no total (nunca mais de uma por mensagem). Assim que tiver o suficiente para indicar um caminho, pare de perguntar e recomende diretamente uma trilha concreta da comunidade, explicando em 1-2 frases por que ela faz sentido para aquele momento. Não peça detalhes de logística (quanto tempo por semana, quando pode começar, etc.) antes de recomendar — isso não muda qual trilha indicar e só alonga a conversa. Depois de recomendar, pergunte se a pessoa quer começar por ali ou se ficou alguma dúvida.

QUANDO NÃO SABE A RESPOSTA
Nunca invente. Diga com clareza que não tem essa informação agora, avise que vai encaminhar para Ana/equipe, e que a resposta volta em breve.

TOM DE VOZ
Acolhedor, sem pressa, claro, com propósito, gentil. Sem jargões agressivos (turbinar, alavancar, explodir), sem promessas mágicas, sem urgência artificial, sem múltiplas exclamações, sem letras maiúsculas de grito. No máximo uma pergunta por mensagem. Respostas diretas e objetivas — evite textos longos quando uma resposta curta resolve. Português brasileiro, registro acessível.`

const SYSTEM_PROMPT = `${IDENTITY}\n\nCONHECIMENTO DAS TRILHAS\n${trilhas}`

export const Route = createFileRoute('/api/chat')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const requestSignal = request.signal

        if (requestSignal.aborted) {
          return new Response(null, { status: 499 })
        }

        const abortController = new AbortController()

        try {
          const body = await request.json()
          const { messages } = body
          const data = body.data || {}

          // Determine the best available provider
          let provider: 'anthropic' | 'openai' | 'gemini' | 'ollama' =
            data.provider || 'ollama'
          let model: string = data.model || 'mistral:7b'

          // Use the first available provider with an API key, fallback to ollama
          if (process.env.ANTHROPIC_API_KEY) {
            provider = 'anthropic'
            model = 'claude-haiku-4-5'
          } else if (process.env.OPENAI_API_KEY) {
            provider = 'openai'
            model = 'gpt-4o'
          } else if (process.env.GEMINI_API_KEY) {
            provider = 'gemini'
            model = 'gemini-2.5-flash'
          }

          const adapterConfig = {
            anthropic: () =>
              anthropicText((model || 'claude-haiku-4-5') as any, {
                maxRetries: 5,
                timeout: 30000,
              }),
            openai: () => openaiText((model || 'gpt-4o') as any),
            gemini: () => geminiText((model || 'gemini-2.5-flash') as any),
            ollama: () => ollamaText((model || 'mistral:7b') as any),
          }

          const adapter = adapterConfig[provider]()

          const stream = chat({
            adapter,
            tools: [],
            systemPrompts: [SYSTEM_PROMPT],
            agentLoopStrategy: maxIterations(5),
            messages,
            abortController,
          })

          return toServerSentEventsResponse(stream, { abortController })
        } catch (error: any) {
          console.error('Chat error:', error)
          if (error.name === 'AbortError' || abortController.signal.aborted) {
            return new Response(null, { status: 499 })
          }
          return new Response(
            JSON.stringify({
              error: 'Failed to process chat request',
              message: error.message,
            }),
            {
              status: 500,
              headers: { 'Content-Type': 'application/json' },
            },
          )
        }
      },
    },
  },
})
