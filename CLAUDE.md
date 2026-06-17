# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## What this is

Project Aura - an AI shopping concierge for the 2026 Kapruka Agent Challenge. It replaces text-heavy chatbots with a full-screen, highly visual chat UI that streams interactive product cards/carousels instead of paragraphs. Targets Sri Lankan e-commerce via Kapruka's live catalog.

The chat surface is built and working end-to-end (Groq → MCP → streamed generative UI). `test-mcp.ts` remains as a standalone connectivity spike.

## Commands

This project uses **pnpm** (note `pnpm-lock.yaml`; `package-lock.json` was removed - do not reintroduce npm).

- `pnpm dev` - dev server at http://localhost:3000
- `pnpm build` - production build
- `pnpm start` - serve the production build
- `pnpm lint` - ESLint (flat config, `eslint-config-next` core-web-vitals + typescript)
- `pnpm dlx tsx test-mcp.ts` - run the standalone Kapruka MCP connectivity spike (no test runner is configured yet)

## Version warning (read before writing framework code)

Versions here are **ahead of typical training data** - do not assume APIs match memory:
- **Next.js 16** (App Router) - per `@AGENTS.md`, read the relevant guide in `node_modules/next/dist/docs/` (`01-app`, `03-architecture`) before writing Next code, and heed deprecation notices.
- **React 19**, **Vercel AI SDK 6** (`ai@^6`), **Tailwind CSS v4** (CSS-first config via `@tailwindcss/postcss`, no `tailwind.config.js`).
- shadcn components are built on **`@base-ui/react`** + **`radix-ui`** (not the older standalone `@radix-ui/react-*` packages).

## Architecture

The flow is: **client `useChat` → `POST /api/chat` (`streamText` + Groq + tools) → tool `execute` calls Kapruka MCP → typed JSON streams back as tool parts → client renders each tool part as a rich component.**

**Generative UI = tool-based, not `ai/rsc`.** In AI SDK 6 the model never streams React. Instead:
- `lib/tools.ts` defines AI SDK `tool()`s (zod `inputSchema`) whose `execute` returns clean, normalized JSON.
- On the client, each assistant message `part` of type `tool-<name>` carries `{ state, input, output }`. `components/aura/tool-part.tsx` switches on `part.type` + `state` to render loading shimmers, then the matching card (`ProductCarousel`, `DeliveryCard`, `CheckoutCard`, …). Adding a new visual = add a tool in `lib/tools.ts` + a case in `tool-part.tsx`.
- A "wall of text" is a regression. The system prompt (`app/api/chat/route.ts`) forbids the model from re-listing products/links/tables in prose after a tool call - the cards already show it. Assistant text is rendered through a safe markdown-lite renderer (`components/aura/markdown.tsx`) that strips raw HTML/tables.

**AI SDK 6 specifics that bit us (don't relearn the hard way):**
- `useChat` lives in **`@ai-sdk/react`**, not `ai`. Pair it with `new DefaultChatTransport({ api: "/api/chat" })` (from `ai`).
- `convertToModelMessages()` is **async** - `await` it.
- Messages use the `parts[]` model; type them with `UIMessage<…, InferUITools<typeof auraTools>>` (see `lib/ai-types.ts`, type-only so it never bundles server code into the client).
- **Groq model choice matters:** `llama-3.3-70b-versatile` frequently emits malformed tool calls ("Failed to call a function"). Default is **`openai/gpt-oss-120b`** (fast + reliable multi-tool calling); override with `GROQ_MODEL`. `GROQ_API_KEY` lives in `.env.local`.

**Kapruka data comes exclusively through MCP** (`lib/kapruka.ts`). There is no local product DB.
- Endpoint `https://mcp.kapruka.com/mcp`, **Streamable HTTP** (`StreamableHTTPClientTransport` from `@modelcontextprotocol/sdk`). Public/free, no auth. The connection is a singleton cached on `globalThis` (HMR-safe).
- Tool args are nested under `params` (e.g. `{ params: { q, limit } }`); responses come back as a `{ result: "<json string>" }` envelope (request `response_format: "json"` and double-parse). `lib/kapruka.ts` normalizes snake_case → camelCase and every fetcher resolves to data **or `{ error }`** (never throws), so the UI degrades gracefully.
- Tools (also exposed to this Claude session as `mcp__kapruka-mcp__*`): search products, get product, list categories, list/check delivery cities, create order (60-min click-to-pay link), track order.
- **Constraints:** 60 req/min per IP, 30 order-creations/hour. `lib/kapruka.ts` mirrors Kapruka's ~30-min server cache with a `globalThis` TTL cache to stay under the limit; orders are never cached.

**Agent tone:** helpful, warm, witty.

## Conventions

- **Path alias:** `@/*` maps to the repo root (`tsconfig.json`). shadcn aliases: `@/components`, `@/components/ui`, `@/lib`, `@/lib/utils`, `@/hooks`.
- **Component layout:** primitives in `components/ui/` (shadcn-style - `button`/`carousel` from the CLI; `badge`/`skeleton` hand-written to match). All feature components live in `components/aura/` and are the building blocks of the chat. The Embla-based `carousel` gives native touch-swipe; the editorial **`Button` is uppercase + sharp-cornered** (`base-sera` style) - override `className` when you want a rounded/lowercase CTA.
- **shadcn/ui** config (`components.json`): style `base-sera`, base color `taupe`, RSC enabled, Lucide icons.
- **Theme:** the warm "Aura" palette + motion utilities (`aura-radial`, `glass`, `aura-shimmer`, `aura-scroll`, `font-heading`, `tnum`) are defined in `app/globals.css` as Tailwind v4 `@theme`/`@utility`. Brand accent tokens: `gold` (primary CTA), `rose`, `jade`. Dark mode is class-based (`.dark`).
- **Fonts** are wired in `app/layout.tsx` as CSS variables: `--font-heading` (Playfair Display, headings), `--font-sans` (Noto Sans, body), plus Geist sans/mono. Use the variables (`font-heading` utility), not direct font imports.
- **Animation** is Framer Motion via the **`motion/react`** import path (the `motion` package, v12). Respect `prefers-reduced-motion`.
- Class merging via `cn()` in `lib/utils.ts` (clsx + tailwind-merge).
