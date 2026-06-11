# Graph Report - .  (2026-06-11)

## Corpus Check
- Corpus is ~15,529 words - fits in a single context window. You may not need a graph.

## Summary
- 240 nodes · 369 edges · 19 communities (11 shown, 8 thin omitted)
- Extraction: 97% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 9 edges (avg confidence: 0.83)
- Token cost: 61,169 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Chat Surface & API Route|Chat Surface & API Route]]
- [[_COMMUNITY_Runtime Dependencies|Runtime Dependencies]]
- [[_COMMUNITY_Generative UI Cards|Generative UI Cards]]
- [[_COMMUNITY_Layout & UI Primitives|Layout & UI Primitives]]
- [[_COMMUNITY_Kapruka MCP Client|Kapruka MCP Client]]
- [[_COMMUNITY_Architecture & Design Concepts|Architecture & Design Concepts]]
- [[_COMMUNITY_shadcn Component Config|shadcn Component Config]]
- [[_COMMUNITY_TypeScript Config|TypeScript Config]]
- [[_COMMUNITY_Product Carousel|Product Carousel]]
- [[_COMMUNITY_Build Tooling & Dev Deps|Build Tooling & Dev Deps]]
- [[_COMMUNITY_pnpm Package Management|pnpm Package Management]]
- [[_COMMUNITY_ESLint Config|ESLint Config]]
- [[_COMMUNITY_Next.js Config|Next.js Config]]
- [[_COMMUNITY_PostCSS Config|PostCSS Config]]
- [[_COMMUNITY_Brand Logos (SVG)|Brand Logos (SVG)]]
- [[_COMMUNITY_File Icon Asset|File Icon Asset]]
- [[_COMMUNITY_Globe Icon Asset|Globe Icon Asset]]
- [[_COMMUNITY_Window Icon Asset|Window Icon Asset]]

## God Nodes (most connected - your core abstractions)
1. `cn()` - 27 edges
2. `compilerOptions` - 16 edges
3. `formatMoney()` - 9 edges
4. `cachedCall()` - 9 edges
5. `toError()` - 9 edges
6. `Badge()` - 7 edges
7. `useCarousel()` - 7 edges
8. `tailwind` - 6 edges
9. `aliases` - 6 edges
10. `AuraMark()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `Tool-Based Generative UI` --semantically_similar_to--> `Generative UI via React Server Components`  [INFERRED] [semantically similar]
  CLAUDE.md → Kapruka Challenge Idea Generation.md
- `MCP Connection Singleton + TTL Cache` --semantically_similar_to--> `Semantic / Cache-Augmented Generation (CAG)`  [INFERRED] [semantically similar]
  CLAUDE.md → Kapruka Challenge Idea Generation.md
- `TextBubble()` --calls--> `cn()`  [EXTRACTED]
  components/aura/message.tsx → lib/utils.ts
- `Next.js 16 Breaking Changes Warning` --conceptually_related_to--> `Next.js create-next-app Bootstrap README`  [AMBIGUOUS]
  AGENTS.md → README.md
- `Project Aura (AI Shopping Concierge)` --conceptually_related_to--> `Next.js create-next-app Bootstrap README`  [INFERRED]
  CLAUDE.md → README.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Aura Runtime Chat Flow (client to MCP to streamed UI)** — claude_chat_flow, claude_generative_ui, claude_kapruka_mcp_integration, claude_groq_model_choice [EXTRACTED 1.00]
- **MCP Rate-Limit Mitigation via Caching** — claude_rate_limit_constraints, claude_mcp_singleton_cache, kapruka_challenge_idea_generation_semantic_caching, kapruka_challenge_idea_generation_mcp_constraints [INFERRED 0.85]
- **Blueprint Concepts Realized in Project Aura** — kapruka_challenge_idea_generation_project_aura_blueprint, kapruka_challenge_idea_generation_generative_ui, kapruka_challenge_idea_generation_deterministic_logistics, claude_project_aura [INFERRED 0.75]
- **Next.js Starter-Template Static Assets** — public_file_icon, public_globe_icon, public_next_logo, public_vercel_logo, public_window_icon [INFERRED 0.95]

## Communities (19 total, 8 thin omitted)

### Community 0 - "Chat Surface & API Route"
Cohesion: 0.11
Nodes (15): AuraChat(), AuraMark(), Hero(), SUGGESTIONS, Markdown(), ChatMessage(), TextBubble(), ToolPart() (+7 more)

### Community 1 - "Runtime Dependencies"
Cohesion: 0.07
Nodes (28): dependencies, ai, @ai-sdk/groq, @ai-sdk/mcp, @ai-sdk/react, @base-ui/react, class-variance-authority, clsx (+20 more)

### Community 2 - "Generative UI Cards"
Cohesion: 0.12
Nodes (17): CategoryGrid(), HERO, CheckoutCard(), DeliveryCard(), OrderTrackingCard(), statusTone, ProductCard(), ProductDetail() (+9 more)

### Community 3 - "Layout & UI Primitives"
Cohesion: 0.16
Nodes (16): geistMono, geistSans, metadata, notoSans, playfairDisplayHeading, RootLayout(), Composer(), stockTone (+8 more)

### Community 4 - "Kapruka MCP Client"
Cohesion: 0.15
Nodes (24): cache(), cachedCall(), cacheKey(), checkDelivery(), City, createOrder(), CreateOrderArgs, DeliveryResult (+16 more)

### Community 5 - "Architecture & Design Concepts"
Cohesion: 0.12
Nodes (22): Next.js 16 Breaking Changes Warning, Aura Theme + Motion Utilities, useChat to /api/chat to MCP Streaming Flow, Tool-Based Generative UI, Groq Model Choice (gpt-oss-120b default), Kapruka MCP Integration (lib/kapruka.ts), MCP Connection Singleton + TTL Cache, Project Aura (AI Shopping Concierge) (+14 more)

### Community 6 - "shadcn Component Config"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 7 - "TypeScript Config"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 8 - "Product Carousel"
Cohesion: 0.18
Nodes (15): GalleryNav(), ProductCarousel(), Carousel(), CarouselApi, CarouselContent(), CarouselContext, CarouselContextProps, CarouselItem() (+7 more)

### Community 9 - "Build Tooling & Dev Deps"
Cohesion: 0.22
Nodes (9): devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, @types/node, @types/react, @types/react-dom (+1 more)

## Ambiguous Edges - Review These
- `Next.js 16 Breaking Changes Warning` → `Next.js create-next-app Bootstrap README`  [AMBIGUOUS]
  AGENTS.md · relation: conceptually_related_to

## Knowledge Gaps
- **108 isolated node(s):** `playfairDisplayHeading`, `notoSans`, `geistSans`, `geistMono`, `metadata` (+103 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Next.js 16 Breaking Changes Warning` and `Next.js create-next-app Bootstrap README`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `cn()` connect `Layout & UI Primitives` to `Chat Surface & API Route`, `Product Carousel`, `Generative UI Cards`?**
  _High betweenness centrality (0.067) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `Build Tooling & Dev Deps` to `Runtime Dependencies`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **What connects `playfairDisplayHeading`, `notoSans`, `geistSans` to the rest of the system?**
  _112 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Chat Surface & API Route` be split into smaller, more focused modules?**
  _Cohesion score 0.11330049261083744 - nodes in this community are weakly interconnected._
- **Should `Runtime Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.06896551724137931 - nodes in this community are weakly interconnected._
- **Should `Generative UI Cards` be split into smaller, more focused modules?**
  _Cohesion score 0.1168091168091168 - nodes in this community are weakly interconnected._