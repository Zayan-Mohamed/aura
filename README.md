<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./public/aura-wordmark-dark.svg">
  <img alt="Aura" src="./public/aura-wordmark-light.svg" width="220">
</picture>

### An AI shopping concierge for Kapruka

A full-screen, highly visual chat that streams interactive product cards instead of paragraphs — shopping Sri Lanka's largest catalogue in the language you actually type.

<p>
  <img alt="Next.js 16" src="https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white">
  <img alt="React 19" src="https://img.shields.io/badge/React-19-20232A?logo=react&logoColor=61DAFB">
  <img alt="TypeScript 5" src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white">
  <img alt="Vercel AI SDK 6" src="https://img.shields.io/badge/AI%20SDK-6-000000?logo=vercel&logoColor=white">
  <img alt="Tailwind CSS v4" src="https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwindcss&logoColor=white">
  <img alt="Supabase" src="https://img.shields.io/badge/Supabase-Postgres%20%2B%20pgvector-3FCF8E?logo=supabase&logoColor=white">
  <img alt="pnpm" src="https://img.shields.io/badge/pnpm-F69220?logo=pnpm&logoColor=white">
</p>
<p>
  <img alt="Models: Groq + Gemini" src="https://img.shields.io/badge/Models-Groq_%E2%86%92_Gemini-D4A24C">
  <img alt="Catalogue: Kapruka MCP" src="https://img.shields.io/badge/Catalogue-Kapruka_MCP-D4A24C">
  <img alt="Agent tools: 11" src="https://img.shields.io/badge/Agent_tools-11-D4A24C">
  <img alt="Languages: 5" src="https://img.shields.io/badge/Languages-5-D4A24C">
  <img alt="Kapruka Agent Challenge 2026" src="https://img.shields.io/badge/Kapruka_Agent_Challenge-2026-B8860B">
</p>

</div>

Aura replaces the text-heavy chatbot with a **full-screen, highly visual chat** that streams interactive product cards, carousels, delivery cards and click-to-pay checkout links instead of paragraphs. It shops Kapruka's **live catalogue** (125,000+ products) over the public MCP server and speaks the way Sri Lankans actually type — English, Sinhala, Tamil, Singlish and Tanglish.

> The model never writes a "wall of text." It calls tools; the UI renders each tool result as a rich component. A paragraph re-listing products is treated as a regression.

## Contents

- [At a glance](#at-a-glance)
- [What it does](#what-it-does)
- [Architecture](#architecture)
- [Resilience: rate limits & graceful degradation](#resilience-rate-limits--graceful-degradation)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Project layout](#project-layout)
- [Deploy](#deploy)

---

## At a glance

| | |
|---|---|
| **Framework** | Next.js 16 (App Router, React 19) |
| **AI orchestration** | Vercel AI SDK 6 (`streamText` + tool calling) |
| **Primary model** | Groq `openai/gpt-oss-120b` (fast, reliable multi-tool calling) |
| **Model resilience** | 3-stage failover chain: Groq 120b → Groq 20b → Gemini 2.5 Flash |
| **Catalogue** | Kapruka MCP (Streamable HTTP, public/free, no local DB) |
| **Agent tools** | 11 (search, compare, delivery, checkout, tracking, visual search, …) |
| **Languages** | 5 — English, Sinhala, Tamil, Singlish (Romanized Sinhala), Tanglish (Romanized Tamil) |
| **Visual search** | Gemini caption → Voyage multimodal-3 embeddings → pgvector ranking |
| **Persistence** | Supabase (auth, saved chats, orders, baskets, occasions) — 8 migrations |
| **Feature components** | 34 in `components/aura/` + 4 shadcn primitives |
| **Styling** | Tailwind CSS v4 (CSS-first config), Framer Motion (`motion/react`) |

---

## What it does

- **Generative product UI** — every search, comparison, delivery check and checkout streams back as a typed card, not prose.
- **Proactive Delivery Confidence** — Aura establishes *where* and *when* early, checks each product against real delivery feasibility, stamps freshness/ETA badges, and quietly hides what can't arrive in time.
- **Multi-language, per-turn** — a fast local detector pins the reply language every turn (so the model can't drift mid-conversation), with an explicit profile override that always wins.
- **Visual search** — upload a photo; Gemini captions it, Voyage embeds the photo + candidate catalogue images into one space, and pgvector ranks the closest real products. *(Behind a feature flag; sign-in gated to protect the free embedding quota.)*
- **Voice input** — push-to-talk dictation via Groq Whisper, transcribed in the shopper's language and appended for review (never auto-sent).
- **Basket → one checkout** — collect several items, then mint a single secure click-to-pay link with a live countdown.
- **Aura Prestige tiers** — verified paid orders unlock real, Aura-layer perks (no fake Kapruka discounts).
- **Saved chats, instant reorder, chat sharing, occasion reminders** — backed by Supabase with owner-scoped RLS.
- **Guided tour** — first-time visitors get an Onborda walkthrough of the key surfaces.

---

## Architecture

```
client useChat  ──POST /api/chat──▶  streamText (Groq + tools)
   │                                      │
   │ renders each tool part               │ tool.execute() calls
   ▼                                      ▼
tool-part.tsx  ◀──typed JSON stream──  Kapruka MCP (lib/kapruka.ts)
```

- **Generative UI is tool-based, not `ai/rsc`.** `lib/tools.ts` defines AI SDK `tool()`s whose `execute` returns clean normalized JSON. On the client, each assistant message `part` of type `tool-<name>` carries `{ state, input, output }`; `components/aura/tool-part.tsx` switches on type + state to render a loading shimmer then the matching card. **Adding a visual = add a tool + a case.**
- **Kapruka data comes exclusively through MCP** — no local product database. `lib/kapruka.ts` normalizes snake_case → camelCase, mirrors Kapruka's ~30-min server cache with a `globalThis` TTL cache to stay under the 60 req/min limit, and every fetcher resolves to data **or `{ error }`** (never throws) so the UI degrades gracefully.
- **System prompt** (`app/api/chat/route.ts`) forbids the model from re-listing products/links/tables in prose after a tool call, and assistant text is rendered through a markdown-lite renderer that strips raw HTML/tables.

### API routes

| Route | Purpose | Soft limit (per IP) |
|---|---|---|
| `POST /api/chat` | Streaming concierge turn (model chain + tools) | 20 / min |
| `POST /api/transcribe` | Groq Whisper speech-to-text | 12 / min |
| `POST /api/reorder` | Rebuild a past order server-side → pay link | — |
| `POST /api/share-checkout` | Public snapshot of a checkout to share | 429 throttled |

---

## Resilience: rate limits & graceful degradation

Aura runs entirely on **free upstream tiers** (Groq, Voyage, Kapruka), so rate-limit handling is a first-class concern, not an afterthought. There are three independent layers:

1. **Per-IP soft throttle** (`lib/rate-limit.ts`) — a best-effort fixed-window counter (20 chat turns/min, 12 dictations/min) blunts a script hammering the open endpoint before it ever spends a token. Over the limit returns `429` + a `retry-after` header and a warm message.
2. **Model failover chain** (`app/api/chat/route.ts`) — when the primary Groq model trips its daily/burst token limit, Aura transparently falls through **Groq 120b → Groq 20b → Gemini 2.5 Flash** (each has a *separate* quota). Pre-output chunks (reasoning, tool-call inputs) are **buffered** so a 429 on the first call is discarded cleanly and the shopper sees one seamless stream from whichever model actually answered. A per-instance cooldown skips the primary while it's known to be cooling down.
3. **Graceful rate-limit UI** — if every model is exhausted, the shopper sees a warm, honest message ("I'm getting a lot of love right now and briefly hit my usage limit. Give me a minute, then tap Retry — your basket and chat are safe.") with a **Retry** button. Any *other* failure gets a distinct generic message instead.

**Rate-limit detection is deliberately precise.** `readRateLimit()` flags a limit error only on a genuine `429`, the explicit phrases (`rate limit`, `rate_limit_exceeded`, `too many requests`, `tokens per minute/day`), or Groq's exact parenthesized token codes (`TPM`/`TPD`). It will **not** mislabel an unrelated failure — a network drop, an invalid tool call, a 5xx, or text that merely contains a trademark "TM" or a product code like "TD-449" — as a rate limit. (An earlier looser pattern matched those bare tokens; it has been tightened so the graceful copy can't be mistriggered.) Verified with a precision/recall battery covering realistic Groq, network, tool and product-text errors.

---

## Tech stack

- **Next.js 16** App Router · **React 19** · **Vercel AI SDK 6** (`ai@^6`) · **TypeScript**
- **Groq** (chat + Whisper STT) with **Google Gemini** fallback/vision
- **Voyage** `multimodal-3` embeddings + **Supabase pgvector** for visual search
- **Kapruka MCP** via `@modelcontextprotocol/sdk` (Streamable HTTP)
- **Supabase** — auth, Postgres (RLS), Edge Functions, `pg_cron` for proactive emails
- **Tailwind CSS v4** (CSS-first `@theme`/`@utility`, no `tailwind.config.js`) · shadcn (`base-sera` style, `taupe` base) on `@base-ui/react` + `radix-ui`
- **Framer Motion** (`motion/react`) · **Onborda** guided tour · **Lucide** icons
- Fonts: Playfair Display (headings), Noto Sans (body), Geist

---

## Getting started

This project uses **pnpm** (do not reintroduce npm — `package-lock.json` was removed).

```bash
pnpm install
pnpm dev          # dev server at http://localhost:3000
```

Other commands:

```bash
pnpm build        # production build
pnpm start        # serve the production build
pnpm lint         # ESLint (flat config: next core-web-vitals + typescript)
pnpm dlx tsx test-mcp.ts   # standalone Kapruka MCP connectivity spike
```

### Environment variables (`.env.local`)

| Variable | Required | Notes |
|---|---|---|
| `GROQ_API_KEY` | **Yes** | Chat + Whisper STT |
| `GROQ_MODEL` | — | Default `openai/gpt-oss-120b` |
| `GROQ_FALLBACK_MODEL` | — | Default `openai/gpt-oss-20b` |
| `GROQ_STT_MODEL` | — | Default `whisper-large-v3-turbo` |
| `GOOGLE_GEMINI_KEY` | — | Enables the Gemini fallback model **and** visual-search captioning |
| `GEMINI_MODEL` / `GEMINI_VISION_MODEL` | — | Default `gemini-2.5-flash` |
| `VOYAGE_API_KEY` | — | Visual-search embeddings |
| `NEXT_PUBLIC_VISUAL_SEARCH` | — | Feature flag for the photo-search UI |
| `NEXT_PUBLIC_SUPABASE_URL` | — | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | — | Supabase publishable key |
| `NEXT_PUBLIC_SITE_URL` | — | Canonical origin for share links |

Without Supabase keys the app still runs as a guest concierge (no saved chats/orders). Without `GOOGLE_GEMINI_KEY`/`VOYAGE_API_KEY` the Gemini fallback and visual search are simply skipped.

---

## Project layout

```
app/
  api/{chat,transcribe,reorder,share-checkout}/route.ts   # server endpoints
  globals.css                                             # Tailwind v4 theme + motion utilities
components/
  aura/        # 34 feature components — the chat surface (cards, carousels, drawers, composer)
  ui/          # shadcn-style primitives (button, carousel, badge, skeleton)
lib/
  tools.ts          # AI SDK tool definitions (zod schemas) — the 11 agent tools
  kapruka.ts        # MCP client + normalized fetchers (TTL-cached, never throws)
  rate-limit.ts     # per-IP soft throttle
  visual-search.ts  # caption → embed → pgvector ranking
  detect-language.ts, tiers.ts, cloud.ts, ai-types.ts, …
supabase/
  migrations/       # 8 migrations (init, pgvector, proactive emails, tiers, RLS, …)
  functions/        # proactive-emails Edge Function (pg_cron + SendGrid)
```

See [`FEATURES.md`](./FEATURES.md) for a tour of what Aura can do and the design principles behind it, and [`CLAUDE.md`](./CLAUDE.md) / [`AGENTS.md`](./AGENTS.md) for engineering conventions (these versions are **ahead of typical training data** — read the bundled Next.js docs before writing framework code).

---

## Deploy

Deploys cleanly to **Vercel** (the `/api/chat` and `/api/transcribe` routes require the Node.js runtime, already declared). Set the environment variables above in the Vercel project, point Supabase at the deployed origin, and run one live voice + checkout test post-deploy.
