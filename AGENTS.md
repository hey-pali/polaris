# AGENTS.md

This document describes the project structure for developers and AI agents working on this codebase.

## Project Overview

A chat application for **Polaris**, a guide agent used by Comunidade Supernova to orient members through their journey inside the community. The UI mimics a familiar messaging app (message bubbles, avatar, typing indicator) rather than a generic chatbot layout, styled in dark charcoal with soft yellow/gold accents.

### Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | TanStack Start |
| Frontend | React 19, TanStack Router v1 |
| Build | Vite 7 |
| Styling | Tailwind CSS 4 (custom CSS variables for the Polaris theme) |
| AI | TanStack AI, multi-provider (Anthropic default via Netlify AI Gateway) |
| Language | TypeScript 5.9 (strict mode) |
| Deployment | Netlify |

## Directory Structure

```
├── public/                    # Static assets (favicon, logos)
├── src
│   ├── lib
│   │   └── ai-hook.ts         # useAIChat hook: wires the UI to /api/chat via SSE
│   ├── routes
│   │   ├── __root.tsx         # HTML shell, fonts (Fraunces + Manrope), page metadata
│   │   ├── api.chat.ts        # POST /api/chat — Polaris system prompt + multi-provider streaming
│   │   └── index.tsx          # Chat screen: header, message thread, composer
│   ├── router.tsx             # TanStack Router setup
│   └── styles.css             # Theme tokens (--polaris-*), chat bubble/typing-indicator styles
├── netlify.toml                # Build command, publish dir, dev server settings
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Key Concepts

### File-Based Routing (TanStack Router)

- `__root.tsx` — root layout wrapping all pages
- `index.tsx` — the `/` route (the chat screen)
- `api.chat.ts` — server route for `/api/chat`, handled by TanStack Start's server handlers

### Polaris persona

The system prompt lives in `src/routes/api.chat.ts` (`SYSTEM_PROMPT`). It defines Polaris as a warm, direct community guide that speaks the member's language (defaulting to Portuguese) and breaks the "next step" into concrete actions. There are no tools wired up — this is a pure conversational guide, not a function-calling assistant. If community-specific facts (schedules, links, rules) need to be injected, extend this prompt or pass them in as additional context rather than hardcoding guesses into the model's behavior.

### AI provider selection

`api.chat.ts` picks the first available provider based on which API key is set in the environment: Anthropic → OpenAI → Gemini → Ollama (local fallback). On Netlify, Anthropic credentials are injected automatically by AI Gateway once the site has a production deploy — no manual key management needed. See the `netlify-ai-gateway` skill for details and the full list of supported model IDs before changing any model string.

### Theme

All Polaris brand colors live as CSS custom properties in `src/styles.css` (`--polaris-void`, `--polaris-gold`, etc.) rather than being hardcoded per component. Reuse those variables when adding new UI so the palette stays consistent. Fonts are loaded via Google Fonts in `__root.tsx`'s `head()` config: **Fraunces** (display/serif, used for the Polaris name and headings) and **Manrope** (body).

### Chat UI conventions

`index.tsx` renders messages as alternating bubbles (gold gradient for the user, dark card for Polaris) with a small circular avatar, closer to a messaging app than a document-style Q&A layout. `TypingIndicator` shows while waiting on the first token of a response. Keep new chat-related UI consistent with this bubble/avatar pattern rather than reverting to a plain list.

## Development Commands

```bash
npm install
npm run dev      # Start dev server on :3000
npm run build    # Production build
```

For the full Netlify runtime (functions, AI Gateway env vars), prefer `netlify dev` over `npm run dev`.

## Environment Variables

Optional — only needed to force a specific provider locally (Netlify injects Anthropic credentials automatically in deployed environments):

```
ANTHROPIC_API_KEY=...
OPENAI_API_KEY=...
GEMINI_API_KEY=...
```
