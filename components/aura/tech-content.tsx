"use client";

import * as React from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowDown,
  BookOpen,
  Layers,
  Atom,
  Workflow,
  Cpu,
  Eye,
  Boxes,
  Database,
  Palette,
  Languages,
  ShieldCheck,
  Search,
  KeyRound,
  MessageSquare,
  LayoutGrid,
  ImagePlus,
  Sparkles,
  Network,
  Image as ImageIcon,
} from "lucide-react";
import { AuraMark } from "./aura-mark";
import { TIER_ICONS } from "./tier-badge";
import { AuroraBackground, Reveal, Stagger, StaggerItem, PulseDot, FlowArrow } from "./fx";
import { TIERS } from "@/lib/tiers";
import { cn } from "@/lib/utils";

/* ---------------------------------------------------------------- helpers */

type Tone = "gold" | "jade" | "rose" | "ink";

const TONES: Record<Tone, { tile: string; ring: string; chip: string }> = {
  gold: { tile: "bg-gold/12 text-gold", ring: "ring-gold/25", chip: "bg-gold/12 text-gold" },
  jade: { tile: "bg-jade/12 text-jade", ring: "ring-jade/25", chip: "bg-jade/12 text-jade" },
  rose: { tile: "bg-rose/12 text-rose", ring: "ring-rose/25", chip: "bg-rose/12 text-rose" },
  ink: { tile: "bg-foreground/8 text-foreground", ring: "ring-border", chip: "bg-muted text-muted-foreground" },
};

function Tag({ children, tone = "ink" }: { children: React.ReactNode; tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-wider",
        TONES[tone].chip,
      )}
    >
      {children}
    </span>
  );
}

function SectionHead({ overline, title, body }: { overline: string; title: string; body?: string }) {
  return (
    <Reveal>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">{overline}</p>
      <h2 className="font-heading mt-2 text-2xl text-foreground sm:text-3xl">{title}</h2>
      {body && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{body}</p>}
    </Reveal>
  );
}

/* --------------------------------------------------------------- diagrams */

type NodeT = { icon: React.ElementType; title: string; sub: string };

function Node({ icon: Icon, title, sub, tone }: NodeT & { tone: Tone }) {
  const t = TONES[tone];
  return (
    <div className="group flex h-full w-full items-center gap-2.5 rounded-xl border border-border bg-background/60 px-3 py-2.5 transition-colors hover:border-gold/40">
      <span
        className={cn(
          "grid size-8 shrink-0 place-items-center rounded-lg ring-1 transition-transform duration-300 group-hover:scale-110",
          t.tile,
          t.ring,
        )}
      >
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold leading-tight text-foreground">{title}</p>
        <p className="text-[0.7rem] leading-tight text-muted-foreground">{sub}</p>
      </div>
    </div>
  );
}

/** A labelled architecture band - a row of nodes that cascade in. */
function Band({ label, tone, nodes, last }: { label: string; tone: Tone; nodes: NodeT[]; last?: boolean }) {
  return (
    <>
      <Reveal>
        <div className="rounded-2xl border border-border bg-card/60 p-4 shadow-sm sm:p-5">
          <Tag tone={tone}>{label}</Tag>
          <Stagger className="mt-3 flex flex-wrap gap-3">
            {nodes.map((n) => (
              <StaggerItem key={n.title} lift className="flex min-w-[8.5rem] flex-1">
                <Node {...n} tone={tone} />
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </Reveal>
      {!last && (
        <div className="flex justify-center py-1.5">
          <FlowArrow>
            <ArrowDown className="size-5 text-muted-foreground/40" />
          </FlowArrow>
        </div>
      )}
    </>
  );
}

type Stage = { tag: string; tone?: Tone; title: string; body: string };

/** A vertical numbered pipeline: pulsing dots + a spine that draws itself in. */
function Timeline({ stages }: { stages: Stage[] }) {
  const reduce = useReducedMotion();
  return (
    <div className="mt-6 flex flex-col">
      {stages.map((s, i) => (
        <Reveal key={s.title} delay={Math.min(i * 0.04, 0.2)}>
          <div className="flex gap-4">
            <div className="flex flex-col items-center">
              <PulseDot className="relative grid size-8 shrink-0 place-items-center rounded-full bg-card text-sm font-semibold text-gold ring-1 ring-border">
                {i + 1}
              </PulseDot>
              {i < stages.length - 1 &&
                (reduce ? (
                  <span className="my-1 w-px flex-1 bg-border" aria-hidden />
                ) : (
                  <motion.span
                    aria-hidden
                    initial={{ scaleY: 0 }}
                    whileInView={{ scaleY: 1 }}
                    viewport={{ once: true, margin: "-40px" }}
                    transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
                    style={{ originY: 0 }}
                    className="my-1 w-px flex-1 bg-gradient-to-b from-gold/50 via-border to-border/20"
                  />
                ))}
            </div>
            <div className="flex-1 pb-5">
              <Tag tone={s.tone ?? "ink"}>{s.tag}</Tag>
              <h3 className="mt-1.5 text-base font-semibold text-foreground">{s.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </div>
          </div>
        </Reveal>
      ))}
    </div>
  );
}

/** A compact left→right (top→bottom on mobile) flow with flowing arrows. */
function MiniFlow({ steps }: { steps: { icon: React.ElementType; label: string; sub?: string }[] }) {
  return (
    <Stagger className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
      {steps.map((s, i) => (
        <React.Fragment key={s.label}>
          <StaggerItem lift className="flex flex-1">
            <div className="flex w-full items-center gap-2.5 rounded-xl border border-border bg-card/70 px-3 py-2.5">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-gold/12 text-gold ring-1 ring-gold/20">
                <s.icon className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-tight text-foreground">{s.label}</p>
                {s.sub && <p className="font-mono text-[0.68rem] leading-tight text-muted-foreground">{s.sub}</p>}
              </div>
            </div>
          </StaggerItem>
          {i < steps.length - 1 && (
            <div className="shrink-0 text-muted-foreground/50">
              <FlowArrow>
                <ArrowDown className="size-4 sm:hidden" />
                <ArrowRight className="hidden size-4 sm:block" />
              </FlowArrow>
            </div>
          )}
        </React.Fragment>
      ))}
    </Stagger>
  );
}

/** The five Aura Prestige rungs, rendered from the shared tier definitions. */
function TierLadder() {
  return (
    <Stagger className="mt-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {TIERS.map((t) => {
        const Icon = TIER_ICONS[t.id];
        return (
          <StaggerItem key={t.id} lift>
            <div className={cn("flex h-full flex-col rounded-2xl border border-border bg-card/70 p-4 ring-1 ring-inset", t.color.ring)}>
              <span className={cn("grid size-9 place-items-center rounded-xl ring-1 ring-inset", t.color.chip, t.color.ring)}>
                <Icon className="size-4" />
              </span>
              <p className={cn("font-heading mt-3 text-base leading-none", t.color.text)}>{t.name}</p>
              <p className="mt-1 text-[0.65rem] font-medium uppercase tracking-widest text-muted-foreground">
                {t.minOrders === 0 ? "Entry" : `${t.minOrders}+ orders`}
              </p>
              <p className="mt-1.5 text-xs font-semibold text-foreground/85">{t.unlock}</p>
              <p className="mt-1 text-[0.72rem] leading-relaxed text-muted-foreground">{t.tagline}</p>
            </div>
          </StaggerItem>
        );
      })}
    </Stagger>
  );
}

/* ------------------------------------------------------------------- data */

const ARCH: { label: string; tone: Tone; nodes: NodeT[] }[] = [
  {
    label: "In the browser",
    tone: "gold",
    nodes: [
      { icon: MessageSquare, title: "Chat UI", sub: "useChat · streaming" },
      { icon: LayoutGrid, title: "Generative UI", sub: "tool-part cards" },
      { icon: ImagePlus, title: "Composer", sub: "text + photo upload" },
    ],
  },
  {
    label: "Aura server - Next.js 16",
    tone: "jade",
    nodes: [
      { icon: Workflow, title: "/api/chat", sub: "streamText + tools" },
      { icon: ShieldCheck, title: "proxy.ts", sub: "session refresh" },
      { icon: KeyRound, title: "/auth/callback", sub: "Google OAuth (PKCE)" },
    ],
  },
  {
    label: "External services",
    tone: "rose",
    nodes: [
      { icon: Cpu, title: "Groq", sub: "gpt-oss-120b · Llama-4 Scout" },
      { icon: Boxes, title: "Kapruka MCP", sub: "live catalog" },
      { icon: ImageIcon, title: "Voyage", sub: "multimodal-3" },
      { icon: Database, title: "Supabase", sub: "Postgres · Auth · pgvector" },
    ],
  },
];

const LIFECYCLE: Stage[] = [
  {
    tag: "Browser",
    title: "You type (or attach a photo)",
    body: "useChat posts the whole conversation to /api/chat through a DefaultChatTransport - no page reloads.",
  },
  {
    tag: "Groq · gpt-oss-120b",
    tone: "gold",
    title: "The model picks the right tools",
    body: "streamText runs the chat brain. It reads your intent and decides which Kapruka tools to call - search, delivery check, create order - rather than guessing from memory.",
  },
  {
    tag: "Kapruka MCP",
    tone: "rose",
    title: "Tools fetch live data",
    body: "Each tool's execute() calls the Kapruka MCP over Streamable HTTP. A 30-minute cache mirrors Kapruka's own, keeping us under the 60-requests/min limit.",
  },
  {
    tag: "AI SDK 6",
    tone: "jade",
    title: "Typed JSON streams back",
    body: "Results return as typed tool-parts - never prose, never React from the model. The model's job is data; the interface owns the visuals.",
  },
  {
    tag: "Browser",
    title: "Each part becomes a card",
    body: "tool-part.tsx switches on the part type to render carousels, delivery cards and checkout links as they stream in. A wall of text would be a regression.",
  },
];

const VISION: Stage[] = [
  {
    tag: "Browser · signed-in only",
    title: "Upload a photo",
    body: "Gated behind a feature flag + login. The image is downscaled to ~512px in the browser, so the upload stays small and fast.",
  },
  {
    tag: "Groq · Llama-4 Scout",
    tone: "gold",
    title: "Caption the image",
    body: "A multimodal model looks at the photo and turns it into a catalog search query plus distinctive attributes (colour, occasion, style).",
  },
  {
    tag: "Kapruka MCP",
    tone: "rose",
    title: "Gather candidates",
    body: "A broad search - with automatic query relaxation - returns real, in-stock products to rank against the photo.",
  },
  {
    tag: "Voyage · multimodal-3",
    tone: "jade",
    title: "Embed into one space",
    body: "The photo and each product image become 1024-dimension vectors from the SAME model - so they share one space and cosine similarity is meaningful.",
  },
  {
    tag: "Supabase · pgvector",
    tone: "jade",
    title: "Rank by cosine",
    body: "Vectors are cached, then ranked with pgvector's <=> operator. A calibrated threshold turns the top score into a verdict - exact match vs. closest visual matches.",
  },
  {
    tag: "Browser",
    title: "Closest matches render",
    body: "Ranked products stream back as the same product cards, topped with a match-confidence header.",
  },
];

const PRESTIGE: Stage[] = [
  {
    tag: "Browser",
    title: "Aura builds your checkout",
    body: "When you confirm an order, Aura mints a real 60-minute Kapruka pay link. Creating a link earns nothing on its own - only a paid order ever counts.",
  },
  {
    tag: "Kapruka",
    tone: "rose",
    title: "You pay - and get an order number",
    body: "Payment happens in the browser; Kapruka then emails you a unique order number (e.g. VIMP34456CB2). That number is the only proof of a completed purchase.",
  },
  {
    tag: "Chat · trackOrder",
    tone: "gold",
    title: "Bring the number back",
    body: "Share the order number and Aura tracks it. A successful lookup confirms - live, against Kapruka - that the order is real and paid.",
  },
  {
    tag: "Supabase · RLS",
    tone: "jade",
    title: "Verified, then counted",
    body: "The confirmed number is recorded once in verified_orders (globally unique, so it can't be reused or claimed by two accounts). Your tier is simply the count of these rows.",
  },
  {
    tag: "Server-authoritative",
    tone: "jade",
    title: "Your tier follows you",
    body: "The chat route reads your tier from the database on every turn - never from a client-supplied number - and greets you by status, unlocking each tier's perk.",
  },
];

const STACK: { icon: React.ElementType; name: string; role: string }[] = [
  { icon: Layers, name: "Next.js 16", role: "App Router, server components, streaming, and the proxy middleware." },
  { icon: Atom, name: "React 19", role: "The component model behind every card and drawer." },
  { icon: Workflow, name: "Vercel AI SDK 6", role: "Chat streaming, tool calling, and tool-based generative UI." },
  { icon: Cpu, name: "Groq · gpt-oss-120b", role: "The chat brain - fast, reliable multi-tool calling in every language." },
  { icon: Eye, name: "Groq · Llama-4 Scout", role: "Vision model that captions uploaded photos for visual search." },
  { icon: Boxes, name: "Kapruka MCP", role: "The single source of truth - live catalog, delivery, and orders." },
  { icon: ImageIcon, name: "Voyage multimodal-3", role: "Image + text embeddings that power visual similarity search." },
  { icon: Database, name: "Supabase", role: "Postgres, Auth (email + Google), row-level security, and pgvector." },
  { icon: Palette, name: "Tailwind v4 + Motion", role: "The warm, editorial palette and every animation." },
];

const TABLES: { name: string; cols: string[]; tag: string; tone: Tone }[] = [
  { name: "profiles", cols: ["name · phone · city", "address · language"], tag: "RLS", tone: "jade" },
  { name: "baskets", cols: ["items (jsonb)"], tag: "RLS", tone: "jade" },
  { name: "conversations", cols: ["title", "updated_at"], tag: "RLS", tone: "jade" },
  { name: "messages", cols: ["role · parts (jsonb)", "conversation_id"], tag: "RLS", tone: "jade" },
  { name: "orders", cols: ["order_ref · status", "summary · checkout_url"], tag: "RLS", tone: "jade" },
  { name: "verified_orders", cols: ["order_number (unique)", "→ Aura Prestige tier"], tag: "RLS", tone: "jade" },
  { name: "product_embeddings", cols: ["embedding vector(1024)", "product_id (cache)"], tag: "pgvector", tone: "rose" },
];

const SMARTS: { icon: React.ElementType; title: string; body: string }[] = [
  {
    icon: ShieldCheck,
    title: "Proactive Delivery Confidence",
    body: "Before showing anything, Aura cross-checks each item against real delivery to your city and date - and quietly hides what can't arrive fresh.",
  },
  {
    icon: Languages,
    title: "Language detection",
    body: "A zero-latency detector reads each message (English, Sinhala, Tamil, Singlish, Tanglish) and pins the reply language - so the model never drifts dialect.",
  },
  {
    icon: Search,
    title: "Query relaxation",
    body: "If an over-specific search comes up short, Aura falls back to the head noun and re-ranks by your terms - so you always get the closest real results.",
  },
];

/* ------------------------------------------------------------------- page */

export function TechContent() {
  return (
    <div className="relative min-h-dvh">
      <AuroraBackground />

      {/* Top bar */}
      <header className="glass sticky top-0 z-30 border-b border-border/70">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-3 sm:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" /> Back to Aura
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/guide"
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <BookOpen className="size-3.5" /> Guide
            </Link>
            <div className="flex items-center gap-2">
              <div className="grid size-8 place-items-center rounded-lg bg-card ring-1 ring-border">
                <AuraMark className="size-4" />
              </div>
              <span className="font-heading text-base text-foreground">Aura</span>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-5xl px-5 pb-24 sm:px-8">
        {/* Hero */}
        <section className="py-14 text-center sm:py-20">
          <Reveal className="flex flex-col items-center">
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 16 }}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/70 px-3 py-1 text-xs font-medium text-muted-foreground"
            >
              <Network className="size-3.5 text-gold" /> Under the hood
            </motion.span>
            <h1 className="font-heading mt-5 text-balance text-4xl leading-[1.05] tracking-tight text-foreground sm:text-5xl">
              How Aura works behind the scenes
            </h1>
            <p className="mt-4 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground">
              Aura is a thin, fast interface wrapped around a few specialised models and one live
              data source. Here&rsquo;s the architecture - what each piece is, and exactly what it
              does - as a set of maps rather than a wall of text.
            </p>
          </Reveal>
        </section>

        {/* Map 1 - Architecture */}
        <section className="py-6">
          <SectionHead
            overline="The big picture"
            title="System architecture"
            body="Three layers. The browser holds the experience, the Next.js server orchestrates, and a handful of external services do the heavy lifting."
          />
          <div className="mt-6">
            {ARCH.map((b, i) => (
              <Band key={b.label} {...b} last={i === ARCH.length - 1} />
            ))}
          </div>
        </section>

        {/* Map 2 - Request lifecycle */}
        <section className="py-12">
          <SectionHead
            overline="One message, start to finish"
            title="The chat request lifecycle"
            body="Every message flows the same way: client → model → tools → live data → streamed cards."
          />
          <Timeline stages={LIFECYCLE} />
        </section>

        {/* Generative UI detail */}
        <section className="py-6">
          <SectionHead
            overline="Generative UI"
            title="How a tool call becomes a card"
            body="The model never streams React. Instead, each tool returns clean JSON that the client maps to a component - adding a new visual = one tool + one case."
          />
          <Reveal className="mt-6 rounded-3xl border border-border bg-card/50 p-4 shadow-sm sm:p-6">
            <MiniFlow
              steps={[
                { icon: Workflow, label: "tool()", sub: "zod inputSchema" },
                { icon: Boxes, label: "execute()", sub: "normalized JSON" },
                { icon: Sparkles, label: "stream part", sub: "tool-<name>" },
                { icon: LayoutGrid, label: "render", sub: "tool-part.tsx" },
              ]}
            />
          </Reveal>
        </section>

        {/* Map 4 - Visual search */}
        <section className="py-12">
          <SectionHead
            overline="The flagship pipeline"
            title="Visual search - photo to product"
            body="Snap a photo of something you saw, and Aura ranks real Kapruka products by how they actually look. Six stages, two models, one vector space."
          />
          <Timeline stages={VISION} />
        </section>

        {/* Map 5 - Stack */}
        <section className="py-6">
          <SectionHead
            overline="The toolkit"
            title="What powers what"
            body="Each piece earns its place. Nothing is here for its own sake."
          />
          <Stagger className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {STACK.map((s) => (
              <StaggerItem key={s.name} lift>
                <div className="flex h-full gap-3 rounded-2xl border border-border bg-card/70 p-4 transition-colors hover:border-gold/40">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-gold/12 text-gold">
                    <s.icon className="size-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{s.name}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{s.role}</p>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </section>

        {/* Smarts */}
        <section className="py-12">
          <SectionHead
            overline="The clever bits"
            title="Three quiet decisions"
            body="Most of Aura's magic is in what it does before you notice."
          />
          <Stagger className="mt-6 grid gap-4 sm:grid-cols-3">
            {SMARTS.map((s) => (
              <StaggerItem key={s.title} lift>
                <div className="flex h-full flex-col rounded-2xl border border-border bg-card/70 p-5">
                  <span className="grid size-10 place-items-center rounded-xl bg-jade/12 text-jade">
                    <s.icon className="size-5" />
                  </span>
                  <h3 className="mt-4 text-base font-semibold text-foreground">{s.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </section>

        {/* Aura Prestige */}
        <section className="py-6">
          <SectionHead
            overline="Loyalty, done right"
            title="Aura Prestige - tiers that can't be gamed"
            body="Every shopper climbs a five-rung ladder. The twist: only PAID orders count, and each one is verified live against Kapruka - so the perks stay honest and the status is earned."
          />
          <TierLadder />
          <Timeline stages={PRESTIGE} />
          <Reveal>
            <div className="flex items-start gap-3 rounded-2xl border border-border bg-card/60 p-4">
              <ShieldCheck className="mt-0.5 size-5 shrink-0 text-jade" />
              <p className="text-sm leading-relaxed text-muted-foreground">
                <span className="font-semibold text-foreground">Why it can&rsquo;t be farmed:</span>{" "}
                creating a checkout link earns nothing, and Kapruka has no payment webhook - so a
                tier credit requires a real, emailed order number that <span className="font-mono text-xs">trackOrder</span>{" "}
                confirms as paid. Numbers are globally unique (one order, one account), de-duplicated
                on write, and your count is read server-side, never trusted from the browser.
              </p>
            </div>
          </Reveal>
        </section>

        {/* Map 6 - Data model */}
        <section className="py-12">
          <SectionHead
            overline="What we store"
            title="The data model"
            body="Everything is per-user and locked down with row-level security - except the embedding cache, which is a shared catalog index."
          />
          <Stagger className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {TABLES.map((t) => (
              <StaggerItem key={t.name} lift>
                <div className="overflow-hidden rounded-2xl border border-border bg-card/70">
                  <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/40 px-3.5 py-2">
                    <span className="font-mono text-sm font-semibold text-foreground">{t.name}</span>
                    <Tag tone={t.tone}>{t.tag}</Tag>
                  </div>
                  <ul className="space-y-1 px-3.5 py-2.5">
                    {t.cols.map((c) => (
                      <li key={c} className="font-mono text-[0.7rem] text-muted-foreground">
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </section>

        {/* CTA */}
        <Reveal>
          <section className="mt-12 overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-gold/10 via-rose/5 to-jade/10 px-6 py-12 text-center sm:px-10 sm:py-16">
            <h2 className="font-heading text-3xl text-foreground sm:text-4xl">See it for yourself.</h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
              The architecture only matters because of what it feels like to use. Start a
              conversation, or read the friendly guide.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-background transition-colors hover:bg-foreground/85"
              >
                Start shopping <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/guide"
                className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
              >
                <BookOpen className="size-4" /> Read the guide
              </Link>
            </div>
          </section>
        </Reveal>
      </main>
    </div>
  );
}
