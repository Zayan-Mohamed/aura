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
    unlock: "Context Vault",
    tagline: "Aura remembers your people, places and preferences — so you never repeat yourself.",
    perks: [
      "Saved delivery addresses & recipients",
      "Remembered preferences and gifting occasions",
      "“Shall I send the usual to Kandy?” shortcuts",
    ],
    agentDirective:
      "The shopper is a Silver member — their Context Vault is unlocked. You already remember their saved addresses, people and preferences (see the profile above); use them proactively and, when natural, warmly acknowledge their Silver status (e.g. “Welcome back — shall I send the usual to Kandy?”). Don't re-ask for details you already hold.",
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
    tagline: "Your delivery comes first — coveted same-day and next-day slots, secured early.",
    perks: [
      "Prioritised delivery checks",
      "First pick of same-day / next-day slots",
      "Perishables (cakes, flowers) expedited",
    ],
    agentDirective:
      "The shopper is a Gold member — Priority Logistics is unlocked. Briefly acknowledge their status and proactively offer to expedite: check delivery early and surface the fastest (same-day / next-day) options for perishables before they fill up.",
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
      "Aura selects & schedules the best match",
      "Set-and-forget occasion delivery",
    ],
    agentDirective:
      "The shopper is a Diamond member — Autonomous Concierge is unlocked. They can hand you a budget and a date (e.g. “spend Rs 10,000 for my mother's birthday next month”) and you can plan it end-to-end: pick the best-matching gift within budget, confirm once, and schedule it to arrive on the date. Acknowledge this elevated status warmly.",
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
    unlock: "White-Glove Access",
    tagline: "The elite tier — waived outstation fees and first access to rare, imported seasonal finds.",
    perks: [
      "Waived outstation delivery fees",
      "Early access to limited & imported items",
      "VIP white-glove handling",
    ],
    agentDirective:
      "The shopper is an Aura member — the elite tier, White-Glove Access unlocked. Treat them as a VIP: mention waived outstation delivery fees where relevant and early access to limited / imported seasonal items. Acknowledge their Aura status with genuine warmth.",
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
