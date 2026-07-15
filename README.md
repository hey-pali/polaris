# Polaris — Comunidade Supernova

A chat app for **Polaris**, the guide agent that walks members of Comunidade Supernova through their journey inside the community. The interface is styled like a familiar messaging app (WhatsApp-style bubbles, avatar, typing indicator) in a dark charcoal theme with soft yellow/gold accents.

## Tech stack

- [TanStack Start](https://tanstack.com/start) (React 19 + TanStack Router) for the app shell and routing
- [TanStack AI](https://tanstack.com/ai) for the streaming chat client/server plumbing
- Anthropic Claude via [Netlify AI Gateway](https://docs.netlify.com/build/ai-gateway/overview/) as the model provider (falls back to OpenAI, Gemini, or a local Ollama model depending on which environment variables are set)
- Tailwind CSS 4 for styling
- Vite 7 as the build tool
- Netlify for hosting and serverless functions

## Running locally

```bash
npm install
npm run dev
```

The app runs at `http://localhost:3000`. To exercise the full Netlify runtime (functions, AI Gateway credentials, etc.), use the Netlify CLI instead:

```bash
netlify dev
```

## AI provider

No API key is required when deployed on Netlify — AI Gateway injects Anthropic credentials automatically once the site has a production deploy. For local development, set one of the following in your environment to pick a provider:

```
ANTHROPIC_API_KEY=...
OPENAI_API_KEY=...
GEMINI_API_KEY=...
```

Without any of these set, the app falls back to a local Ollama model (`mistral:7b`).

## Where things live

- `src/routes/index.tsx` — the chat screen (header, message thread, composer)
- `src/routes/api.chat.ts` — the streaming chat endpoint and Polaris's system prompt
- `src/lib/ai-hook.ts` — the `useAIChat` hook wiring the UI to the streaming endpoint
- `src/styles.css` — the dark/gold theme tokens and chat bubble styling
