/**
 * Aura Prestige — a "high-perceived-value, low-cost" loyalty ladder.
 *
 * A shopper's tier is DERIVED purely from how many orders they've placed
 * (each successful `createOrder` is a step up) — no points engine, no schema
 * for the tier itself. This module is the single source of truth shared by the
 * client (badge + ladder sidebar) and the server (system-prompt injection), so
 * it stays pure data: strings, numbers and static Tailwind class fragments only
 * (no React/icon imports — those are mapped by tier id in the UI components).
 */

export type TierId = "bronze" | "silver" | "gold" | "diamond" | "aura";

/**
 * Order-count thresholds at which a tier's *enforced* perk switches on. These are
 * the single source of truth for gating: the chat route reads them to filter the
 * runtime toolset, inject the Gold delivery directive, etc. They intentionally
 * mirror the matching tier's `minOrders` so "reached the tier" ⇔ "perk unlocked".
 */
export const TIER_GATES = {
  /** Silver: Aura sends proactive occasion-reminder / gift-idea emails. */
  proactiveConcierge: 1,
  /** Gold: always-on delivery confidence (saved city auto-passed as deliverTo). */
  priorityLogistics: 3,
  /** Diamond: the `planGift` autonomous-gifting tool is in the runtime toolset. */
  autonomousConcierge: 10,
} as const;

/**
 * Whether a shopper with `orderCount` verified orders has unlocked the perk gated
 * at `gate`. Guests / unknown counts (undefined) never qualify.
 */
export function hasPerk(orderCount: number | undefined, gate: number): boolean {
  return typeof orderCount === "number" && Number.isFinite(orderCount) && orderCount >= gate;
}

export type Tier = {
  id: TierId;
  /** Display name (without the "Aura " prefix). */
  name: string;
  /** Orders required to reach this tier (inclusive lower bound). */
  minOrders: number;
  /** The headline benefit this tier unlocks. */
  unlock: string;
  /** One warm line describing the perk, shown under the unlock in the ladder. */
  tagline: string;
  /** Concrete perks, listed in the ladder card. */
  perks: string[];
  /**
   * One sentence injected into the chat system prompt for a shopper AT this
   * tier — tells Aura how to acknowledge the status and which perk to offer.
   */
  agentDirective: string;
  /** Static Tailwind class fragments (scanned literally by Tailwind v4). */
  color: {
    text: string;
    chip: string;
    ring: string;
    solid: string;
    soft: string;
  };
};

// Ascending by threshold. Thresholds follow the feature brief; the elite "Aura"
// tier (unspecified there) sits at 25 orders — rare enough to feel like an honour.
export const TIERS: Tier[] = [
  {
    id: "bronze",
    name: "Bronze",
    minOrders: 0,
    unlock: "Standard Concierge",
    tagline: "Warm, conversational shopping help and standard delivery options.",
    perks: ["Full AI shopping assistant", "Live Kapruka catalogue", "Standard delivery"],
    agentDirective:
      "The shopper is a Bronze member — just getting started. Be your usual warm, helpful self; there are no special perks to mention yet, but you can gently note that placing their first order unlocks Silver.",
    color: {
      text: "text-[oklch(0.55_0.085_55)] dark:text-[oklch(0.76_0.09_62)]",
      chip: "bg-[oklch(0.55_0.085_55)]/12 text-[oklch(0.48_0.09_50)] dark:text-[oklch(0.8_0.09_62)]",
      ring: "ring-[oklch(0.55_0.085_55)]/30",
      solid: "bg-[oklch(0.6_0.1_56)]",
      soft: "bg-[oklch(0.55_0.085_55)]/8",
    },
  },
  {
    id: "silver",
    name: "Silver",
    minOrders: 1,
    unlock: "Proactive Concierge",
    tagline: "Aura watches your calendar and reaches out — gentle reminders and gift ideas before the day arrives.",
    perks: [
      "Occasion & birthday email reminders",
      "Curated gift ideas a few days before",
      "Aura nudges you so you never miss the date",
    ],
    agentDirective:
      "The shopper is a Silver member — Proactive Concierge is unlocked, so you can look after them between visits. Offer to remember important dates (birthdays, anniversaries, sympathy follow-ups) and reassure them you'll send a gentle email reminder with gift ideas a few days before. When it fits, invite them to save an occasion. Warmly acknowledge their Silver status. (Remembering their saved address/preferences is standard for everyone — the Silver perk is the proactive outreach.)",
    color: {
      text: "text-[oklch(0.6_0.02_255)] dark:text-[oklch(0.8_0.02_255)]",
      chip: "bg-[oklch(0.6_0.02_255)]/14 text-[oklch(0.52_0.02_255)] dark:text-[oklch(0.84_0.02_255)]",
      ring: "ring-[oklch(0.6_0.02_255)]/30",
      solid: "bg-[oklch(0.66_0.02_255)]",
      soft: "bg-[oklch(0.6_0.02_255)]/8",
    },
  },
  {
    id: "gold",
    name: "Gold",
    minOrders: 3,
    unlock: "Priority Logistics",
    tagline: "Delivery confidence on by default — Aura checks feasibility on every search and shows only what truly arrives.",
    perks: [
      "Always-on delivery confidence",
      "Every search checked against real delivery",
      "Perishable freshness flagged first",
    ],
    agentDirective:
      "The shopper is a Gold member — Priority Logistics is unlocked. Treat delivery confidence as ALWAYS-ON: their saved city is passed as deliverTo on every search, so you only ever show what can actually arrive, with perishables flagged for freshness first. Briefly acknowledge their Gold status. (Don't promise faster Kapruka slots — your edge is showing only what genuinely reaches them.)",
    color: {
      text: "text-gold",
      chip: "bg-gold/14 text-gold",
      ring: "ring-gold/35",
      solid: "bg-gold",
      soft: "bg-gold/8",
    },
  },
  {
    id: "diamond",
    name: "Diamond",
    minOrders: 10,
    unlock: "Autonomous Concierge",
    tagline: "Hand Aura a budget and a date — it plans, picks and routes the gift for you.",
    perks: [
      "Budget-and-date autonomous gifting",
      "Aura selects the best in-budget match",
      "One-tap confirm into checkout",
    ],
    agentDirective:
      "The shopper is a Diamond member — Autonomous Concierge is unlocked, and you have a dedicated `planGift` tool. When they hand you a budget, occasion, date and city (e.g. “spend Rs 10,000 for my mother's birthday next month in Kandy”), call planGift: it curates the best in-budget, deliverable match and presents it for one-tap confirmation. Acknowledge this elevated status warmly.",
    color: {
      text: "text-[oklch(0.62_0.11_215)] dark:text-[oklch(0.78_0.11_210)]",
      chip: "bg-[oklch(0.62_0.11_215)]/14 text-[oklch(0.55_0.11_215)] dark:text-[oklch(0.82_0.11_210)]",
      ring: "ring-[oklch(0.62_0.11_215)]/30",
      solid: "bg-[oklch(0.66_0.12_212)]",
      soft: "bg-[oklch(0.62_0.11_215)]/8",
    },
  },
  {
    id: "aura",
    name: "Aura",
    minOrders: 25,
    unlock: "White-Glove Curation",
    tagline: "The elite tier — first-look curated picks and a concierge who flags any delivery risk before you pay.",
    perks: [
      "Curated first-look picks from the catalogue",
      "Proactive outstation freshness & timing checks",
      "VIP white-glove attention",
    ],
    agentDirective:
      "The shopper is an Aura member — the elite tier, White-Glove Curation unlocked. Treat them as a VIP: lead with curated, first-look picks and proactively double-check outstation freshness and timing, flagging any delivery risk before they pay. Your privilege is taste and care — NEVER claim waived delivery fees or special inventory access (Aura can't change Kapruka's prices or stock). Acknowledge their Aura status with genuine warmth.",
    color: {
      text: "text-[oklch(0.62_0.16_330)] dark:text-[oklch(0.78_0.15_330)]",
      chip: "bg-[oklch(0.62_0.16_330)]/14 text-[oklch(0.55_0.16_330)] dark:text-[oklch(0.82_0.15_330)]",
      ring: "ring-[oklch(0.62_0.16_330)]/35",
      solid: "bg-[oklch(0.66_0.17_330)]",
      soft: "bg-[oklch(0.62_0.16_330)]/8",
    },
  },
];

/** The highest tier a shopper with `orders` orders has reached. */
export function tierForOrders(orders: number): Tier {
  let reached = TIERS[0];
  for (const tier of TIERS) if (orders >= tier.minOrders) reached = tier;
  return reached;
}

/** The tier directly above `tier`, or null if it's already the top tier. */
export function nextTier(tier: Tier): Tier | null {
  const i = TIERS.findIndex((t) => t.id === tier.id);
  return i >= 0 && i < TIERS.length - 1 ? TIERS[i + 1] : null;
}

export type TierProgress = {
  current: Tier;
  next: Tier | null;
  /** Orders still needed to reach `next` (null at the top tier). */
  ordersToNext: number | null;
  /** 0–100 progress through the current tier toward the next (100 at the top). */
  pct: number;
};

/** Where a shopper sits on the ladder, for the badge + progress bar. */
export function tierProgress(orders: number): TierProgress {
  const current = tierForOrders(orders);
  const next = nextTier(current);
  if (!next) return { current, next: null, ordersToNext: null, pct: 100 };
  const span = next.minOrders - current.minOrders;
  const into = Math.max(0, orders - current.minOrders);
  const pct = span > 0 ? Math.min(100, Math.round((into / span) * 100)) : 0;
  return { current, next, ordersToNext: Math.max(0, next.minOrders - orders), pct };
}
