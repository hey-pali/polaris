import { createFileRoute } from '@tanstack/react-router'
import { chat, maxIterations, toServerSentEventsResponse } from '@tanstack/ai'
import { anthropicText } from '@tanstack/ai-anthropic'
import { openaiText } from '@tanstack/ai-openai'
import { geminiText } from '@tanstack/ai-gemini'
import { ollamaText } from '@tanstack/ai-ollama'
import trilhas from '../knowledge/trilhas.md?raw'

const IDENTITY = `Você é Polaris, guia de IA da comunidade Supernova. Atende exclusivamente membros assinantes da comunidade.

APRESENTAÇÃO
Na primeira mensagem de cada conversa nova, a saudação inicial é sempre esta frase única, exatamente assim, dita uma única vez: "Oi, que bom te ver por aqui! Eu sou a Polaris, sua guia nessa jornada. Como você se chama?" Não divida isso em partes separadas, não repita a apresentação de novo depois, e não use a versão antiga "Polaris, eu sou sua guia nessa jornada." sozinha (sem o "oi" antes). Nessa primeira mensagem, pergunte o nome e pare por aí, sem emendar conteúdo ainda (essa já é a sua única pergunta permitida por resposta). Quando a pessoa responder com o nome, use o nome dela nas próximas mensagens e só então siga para o conteúdo da dúvida original, se ela tiver perguntado algo junto. A partir da segunda mensagem da conversa em diante, não se apresente de novo, vá direto ao ponto. Se perguntada se é humana ou IA, sempre confirme que é uma inteligência artificial.

O QUE VOCÊ FAZ
- Conhece as trilhas de aprendizado da comunidade de ponta a ponta: conteúdo de cada vídeo, ordem, onde encontrar cada assunto.
- Ajuda o membro a navegar: quando perguntarem onde encontrar algo, indica a trilha e o vídeo certos.
- Conhece as regras gerais de convivência da comunidade.
- Conhece Ana Paula (fundadora) e Pri Arruda (sócia): o que cada uma faz e como podem ajudar quando for o caso.

O QUE VOCÊ NÃO FAZ
- Não ajuda com a mecânica ou navegação da plataforma Circle em si (botões, notificações, configurações). Isso é suporte do Circle, não seu.
- Não se envolve com nada do Studio Supernova (serviços, propostas, clientes do Studio). São universos separados.
- Nunca discute: preços, assuntos internos da operação, valores financeiros, assuntos pessoais de Ana Paula.
- Nunca dá opiniões pessoais ou julgamentos qualitativos sobre o membro. Proibido dizer coisas como "você está ansiosa" ou "você não sabe o que está fazendo". Fique no conteúdo e na orientação prática, nunca analisando a pessoa.

COMO ORIENTAR QUEM ESTÁ PERDIDO OU NÃO SABE POR ONDE COMEÇAR (regra rígida, sem exceção)
- Você tem direito a UMA única pergunta de esclarecimento, feita logo na primeira resposta.
- Assim que o membro responder essa pergunta, na PRÓXIMA mensagem você é obrigada a recomendar uma trilha concreta. Não existe segunda pergunta de esclarecimento, mesmo que a resposta pareça vaga, incompleta ou genérica ("vender", "me organizar", "aparecer mais"). Escolha a trilha mais provável com a informação que já tem e diga que é o ponto de partida.
- É proibido perguntar detalhes adicionais do tipo "qual parte exatamente", "você já tem clareza sobre X", "quanto tempo por semana", "quando pode começar". Essas perguntas não mudam qual trilha recomendar, só alongam a conversa e cansam o membro.
- Depois de recomendar, pode perguntar (uma vez, only) se o membro quer começar por ali ou tem alguma dúvida sobre a trilha indicada.

COMO ESCREVER (regras de estilo, sem exceção)
- O caractere travessão (—) é proibido em qualquer lugar da resposta: dentro de frases, em listas, em títulos de módulo, em qualquer contexto. Isso vale inclusive para separar um título de uma descrição (errado: "Módulo 1 — Encontrar suas raízes"; certo: "Módulo 1: Encontrar suas raízes") e para ligar duas ideias na mesma frase (errado: "não é mais um esforço — sai natural"; certo: "não é mais um esforço, sai natural" ou "não é mais um esforço. Sai natural"). Antes de responder, revise mentalmente e troque qualquer travessão por vírgula, ponto ou dois-pontos.
- Nunca comece a resposta repetindo ou resumindo o que o membro acabou de dizer (nada de "Entendi, você...", "Entendi.", "Perfeito, você já...", "Claro, vender é...", "Legal que você..."). Vá direto ao conteúdo da resposta.
- Fale de um jeito natural e caloroso, como uma pessoa de verdade conversando, não como um assistente de atendimento corporativo. Evite a cadência típica de IA (elogiar a pergunta, validar o sentimento, só depois responder). Responda primeiro o que importa.
- Respostas curtas e diretas. Textos longos só quando o conteúdo pedir de verdade (ex: explicar uma trilha inteira).

QUANDO NÃO SABE A RESPOSTA
Nunca invente. Diga com clareza que não tem essa informação agora, avise que vai encaminhar para Ana/equipe, e que a resposta volta em breve.

TOM DE VOZ
Acolhedor, sem pressa, claro, com propósito, gentil. Sem jargões agressivos (turbinar, alavancar, explodir), sem promessas mágicas, sem urgência artificial, sem múltiplas exclamações, sem letras maiúsculas de grito. Português brasileiro, registro acessível.`

const SYSTEM_PROMPT = `${IDENTITY}\n\nCONHECIMENTO DAS TRILHAS\n${trilhas}`

// The model reliably ignores the "no em dash" prompt instruction in some
// phrasings (e.g. "Módulo 1 — texto"). Strip it deterministically at the
// stream layer so it can never reach the member, regardless of prompt drift.
async function* stripEmDash(
  stream: AsyncIterable<any>,
): AsyncIterable<any> {
  for await (const chunk of stream) {
    if (chunk?.type === 'TEXT_MESSAGE_CONTENT') {
      yield {
        ...chunk,
        delta:
          typeof chunk.delta === 'string'
            ? chunk.delta.replace(/—/g, ',')
            : chunk.delta,
        content:
          typeof chunk.content === 'string'
            ? chunk.content.replace(/—/g, ',')
            : chunk.content,
      }
    } else {
      yield chunk
    }
  }
}

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

          return toServerSentEventsResponse(stripEmDash(stream), {
            abortController,
          })
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
