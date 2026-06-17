/**
 * AI SDK tool definitions for the Aura concierge.
 *
 * These wrap the Kapruka MCP fetchers (lib/kapruka.ts) and return clean,
 * normalized objects. Each tool's `output` is what the client renders as a
 * rich UI part (product carousels, delivery cards, checkout links, ...), so
 * the shapes here are the contract between the model and the interface.
 */
import { tool } from "ai";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import * as kapruka from "./kapruka";
import { visualSearch } from "./visual-search";
import { countOrders, recordVerifiedOrder } from "./cloud";
import { tierForOrders, hasPerk, TIER_GATES, type TierId } from "./tiers";
import {
  searchResultToModel,
  visualResultToModel,
  productDetailToModel,
  compareResultToModel,
  planGiftToModel,
} from "./model-output";

/**
 * Per-request context injected into the tools.
 * - `imageDataUrl`: the shopper's uploaded photo for the current turn (set by
 *   the chat route) — visualSearch reads it from here, not from model args.
 * - `db` / `userId`: the signed-in shopper's Supabase session + id, so a
 *   confirmed track_order can credit their Aura Prestige tier. Absent for guests.
 */
export type AuraToolContext = {
  imageDataUrl?: string;
  db?: SupabaseClient;
  userId?: string;
  /** Server-authoritative verified-order count — gates tier perks. Absent for guests. */
  orderCount?: number;
  /** The shopper's saved delivery city — auto-used as deliverTo for Gold+ Priority Logistics. */
  defaultCity?: string;
};

/** Kapruka statuses that are NOT a completed, paid purchase — never credited. */
const UNPAID_STATUSES = new Set([
  "cancelled",
  "canceled",
  "refunded",
  "rejected",
  "failed",
  "void",
  "expired",
  "pending",
  "pending-payment",
  "awaiting-payment",
  "unpaid",
]);

export type LoyaltyResult = {
  /** A brand-new verified order was recorded this call. */
  credited: boolean;
  /** The tier name moved up as a result. */
  leveledUp: boolean;
  /** Total verified (paid) orders now. */
  count: number;
  tierId: TierId;
  tierName: string;
};

/**
 * Credit a signed-in shopper's tier for a track_order that came back as a real,
 * paid order. Only reachable with a valid Kapruka order number (track_order
 * succeeded), recorded de-duplicated + globally unique — so it can't be farmed.
 * Returns null for guests / cancelled orders (no credit, nothing to show).
 */
async function creditLoyalty(
  ctx: AuraToolContext,
  tracking: kapruka.OrderTracking,
): Promise<LoyaltyResult | null> {
  if (!ctx.db || !ctx.userId) return null; // guest — can't earn until signed in
  const orderNumber = tracking.orderNumber?.trim();
  if (!orderNumber) return null;
  if (UNPAID_STATUSES.has((tracking.status ?? "").toLowerCase())) return null;

  const before = await countOrders(ctx.db, ctx.userId);
  const credited = await recordVerifiedOrder(ctx.db, ctx.userId, {
    orderNumber,
    status: tracking.status,
    amount: tracking.amount,
    recipientName: tracking.recipient?.name ?? null,
  });
  const count = credited ? before + 1 : before;
  return {
    credited,
    leveledUp: credited && tierForOrders(count).id !== tierForOrders(before).id,
    count,
    tierId: tierForOrders(count).id,
    tierName: tierForOrders(count).name,
  };
}

export function makeAuraTools(ctx: AuraToolContext = {}) {
  return {
  searchProducts: tool({
    description:
      "Search Kapruka's live catalog for purchasable products by keyword — groceries, electronics, fashion, home, essentials, gifts, anything. Use this whenever the shopper wants to find, browse, or compare items. Returns product cards the UI renders as a swipeable gallery — so prefer this over describing products in text. When you know the destination city (and ideally the date), pass deliverTo/deliverBy to enable Proactive Delivery Confidence: the catalog is filtered to only what can actually arrive, each card stamped with a freshness/ETA badge.",
    inputSchema: z.object({
      q: z.string().min(3).describe("Search query, e.g. 'red roses', 'basmati rice', 'wireless headphones'. Min 3 chars."),
      category: z.string().optional().describe("Optional category name to narrow results (e.g. 'Chocolates', 'flowers')."),
      limit: z.number().int().min(1).max(12).optional().describe("How many products to return (default 8)."),
      minPrice: z.number().optional().describe("Minimum price in LKR."),
      maxPrice: z.number().optional().describe("Maximum price in LKR."),
      sort: z
        .enum(["relevance", "price_asc", "price_desc", "newest", "bestseller"])
        .optional()
        .describe("Result ordering."),
      deliverTo: z
        .string()
        .optional()
        .describe("Destination city (e.g. 'Kandy', 'Colombo 03'). When set, results are filtered to what can actually be delivered there, with per-item freshness/ETA badges. Use as soon as you know where it's going."),
      deliverBy: z
        .string()
        .optional()
        .describe("Target delivery date YYYY-MM-DD (Asia/Colombo). Pair with deliverTo to check freshness for that date; omit for today."),
      rationale: z
        .string()
        .max(160)
        .nullish()
        .describe("Optional ONE concierge-style line explaining WHY you picked these for this shopper (e.g. 'soft, under budget, and reaches Kandy fresh'). Shown above the cards — keep it short, warm, specific. Omit for a plain browse."),
    }),
    execute: async ({ rationale, ...args }) => {
      // Gold+ Priority Logistics (enforced, not just prompted): default delivery
      // confidence to their saved city so EVERY search is checked against real
      // delivery — even if the model forgets to pass deliverTo. A destination the
      // shopper names explicitly always wins.
      if (!args.deliverTo && ctx.defaultCity && hasPerk(ctx.orderCount, TIER_GATES.priorityLogistics)) {
        args.deliverTo = ctx.defaultCity;
      }
      const res = await kapruka.searchProducts(args);
      // Merge the model's "why these" line into the output so the UI can show
      // it above the carousel (it's not catalog data, so it lives outside kapruka).
      return rationale && !("error" in res) ? { ...res, rationale } : res;
    },
    // Hand the model a compact table (no image/URL bytes); the UI still gets
    // the full objects as the rendered tool-part output.
    toModelOutput: ({ output }) => ({ type: "text", value: searchResultToModel(output) }),
  }),

  compareProducts: tool({
    description:
      "Put 2–4 products side by side as a comparison table (price, savings, stock, delivery, category) so the shopper can decide. Use when they ask to 'compare these', are torn between options, or you want to help them choose well. Pass the exact Kapruka product IDs from a recent search/carousel. Add a short `verdict` recommending one and why.",
    inputSchema: z.object({
      productIds: z
        .array(z.string())
        .min(2)
        .max(4)
        .describe("2–4 Kapruka product IDs to compare, from a recent search."),
      verdict: z
        .string()
        .max(200)
        .nullish()
        .describe("Optional one-line recommendation shown under the table (e.g. 'The M17 wins on value — 5G and double the storage for Rs 4,600 more')."),
    }),
    execute: async ({ productIds, verdict }) => {
      const res = await kapruka.compareProducts(productIds);
      return verdict && !("error" in res) ? { ...res, verdict } : res;
    },
    toModelOutput: ({ output }) => ({ type: "text", value: compareResultToModel(output) }),
  }),

  getProduct: tool({
    description:
      "Fetch full details for a single product by its Kapruka product ID, including the full image gallery and description. Use when the shopper wants a closer look at one item, or before creating an order.",
    inputSchema: z.object({
      productId: z.string().describe("Kapruka product ID, e.g. 'FLOWERS00T2089'."),
    }),
    execute: async ({ productId }) => kapruka.getProduct(productId),
    toModelOutput: ({ output }) => ({ type: "text", value: productDetailToModel(output) }),
  }),

  listCategories: tool({
    description:
      "List Kapruka's top-level shopping categories. Use to help an undecided shopper browse, or to suggest directions when a search comes up empty.",
    inputSchema: z.object({}),
    execute: async () => kapruka.listCategories(),
  }),

  listDeliveryCities: tool({
    description:
      "Find Sri Lankan cities Kapruka delivers to. Pass a partial name to filter (e.g. 'colombo', 'galle'). Use to confirm the canonical city name before checking delivery or creating an order.",
    inputSchema: z.object({
      query: z.string().optional().describe("Partial city name to filter by."),
    }),
    execute: async ({ query }) => kapruka.listDeliveryCities(query),
  }),

  checkDelivery: tool({
    description:
      "Check whether Kapruka can deliver to a given city on a given date, and the flat delivery rate. Pass a product ID when checking perishables (cakes/flowers) so freshness warnings surface.",
    inputSchema: z.object({
      city: z.string().describe("Canonical city name, e.g. 'Colombo 03', 'Galle'."),
      deliveryDate: z.string().optional().describe("Target date YYYY-MM-DD (Sri Lanka time). Omit for today."),
      productId: z.string().optional().describe("Optional product ID to enable perishable freshness warnings."),
    }),
    execute: async (args) => kapruka.checkDelivery(args),
  }),

  createOrder: tool({
    description:
      "Create a guest-checkout order and return a 60-minute click-to-pay link (no Kapruka account needed). ONLY call this once you have explicitly confirmed with the shopper: the exact item(s), recipient name + phone, full delivery address + city + date, and sender name. Never invent these details — ask for anything missing first.",
    inputSchema: z.object({
      cart: z
        .array(
          z.object({
            productId: z.string(),
            quantity: z.number().int().min(1).max(99).optional(),
            icingText: z.string().max(120).optional().describe("Cake icing text (cakes only)."),
          }),
        )
        .min(1)
        .max(30),
      recipient: z.object({
        name: z.string(),
        phone: z.string().describe("E.164 (+9477...) or local (077...) format."),
      }),
      delivery: z.object({
        address: z.string(),
        city: z.string().describe("Must be a Kapruka delivery city."),
        date: z.string().describe("YYYY-MM-DD, today or future, Asia/Colombo."),
        locationType: z.enum(["house", "apartment", "office", "other"]).optional(),
        instructions: z.string().optional(),
      }),
      sender: z.object({
        name: z.string(),
        anonymous: z.boolean().optional(),
      }),
      giftMessage: z.string().max(300).optional(),
    }),
    execute: async (args) => kapruka.createOrder(args),
  }),

  trackOrder: tool({
    description:
      "Look up the status and delivery timeline of a paid Kapruka order by its order number (from the confirmation email — NOT the pre-payment order_ref). A successful lookup also VERIFIES the purchase and counts it toward the shopper's Aura Prestige tier — so when a signed-in shopper mentions they've paid/received an order, invite them to share that order number and call this.",
    inputSchema: z.object({
      orderNumber: z.string().describe("Kapruka order number, e.g. 'VIMP34456CB2'."),
    }),
    execute: async ({ orderNumber }) => {
      const res = await kapruka.trackOrder(orderNumber);
      if ("error" in res) return res;
      // Credit the tier as a side-effect — only a real, paid order reaches here.
      const loyalty = await creditLoyalty(ctx, res);
      return { ...res, loyalty };
    },
  }),

  askChoice: tool({
    description:
      "Ask the shopper a SHORT question with tappable answer buttons instead of asking in plain prose. Use this whenever the answer is one of a few discrete choices — yes/no, a budget band, an occasion type, 'this or that', which colour, pick a delivery date, 'add a gift message?', etc. It's far nicer than a wall of text and keeps the conversation moving. Give 2–5 concise options; the shopper taps and their answer arrives as their next message. Do NOT use it for open-ended questions (a name, an address, free-form ideas) — let them type those. After calling it, STOP and wait for their tap; don't also write the question as text.",
    inputSchema: z.object({
      question: z.string().max(160).describe("The one-line question shown above the buttons."),
      options: z
        .array(
          z.object({
            label: z.string().max(48).describe("Short button text, e.g. 'Under Rs 5,000', 'Yes', 'Roses'."),
            value: z
              .string()
              .max(200)
              .nullish()
              .describe("Optional fuller message sent when tapped (defaults to the label). Use it to send a clearer instruction, e.g. label 'Yes' → value 'Yes, go ahead and check delivery to Kandy.'"),
          }),
        )
        .min(2)
        .max(5)
        .describe("2–5 answer options."),
      multiSelect: z
        .boolean()
        .nullish()
        .describe("Set true when the shopper may pick SEVERAL (e.g. 'which of these would you like?'). Default false = pick one, which sends immediately."),
      note: z.string().max(120).nullish().describe("Optional short helper line under the question."),
    }),
    execute: async ({ question, options, multiSelect, note }) => ({
      question,
      options: options.map((o) => ({ label: o.label, value: o.value ?? undefined })),
      multiSelect: multiSelect ?? false,
      note: note ?? undefined,
    }),
    toModelOutput: ({ output }) => ({
      type: "text",
      value: `Asked the shopper "${output.question}" with tappable options [${output.options
        .map((o) => o.label)
        .join(", ")}]. Their choice will arrive as the next user message — wait for it; don't repeat the question in prose.`,
    }),
  }),

  planGift: tool({
    description:
      "Autonomous gifting for Diamond-tier members. Given a budget, occasion, delivery date and destination city, search the live catalogue, pick the single best in-budget item that can actually arrive in time, and return ONE curated proposal the shopper confirms in a tap (which flows into the normal createOrder checkout). Use this when a Diamond member hands you a budget + date instead of browsing themselves — don't make them pick.",
    inputSchema: z.object({
      budgetLKR: z.number().int().min(500).describe("Total budget in LKR."),
      occasion: z.string().describe("The occasion, e.g. \"mother's birthday\", 'anniversary', 'sympathy'."),
      date: z.string().describe("Target delivery date YYYY-MM-DD (Asia/Colombo)."),
      city: z.string().describe("Destination city (a canonical Kapruka delivery city)."),
      recipientName: z.string().nullish().describe("Who it's for, if known."),
      notes: z
        .string()
        .max(200)
        .nullish()
        .describe("Colour / style / dietary / interest hints to steer the pick."),
    }),
    execute: async ({ budgetLKR, occasion, date, city, recipientName, notes }) => {
      const res = await kapruka.searchProducts({
        q: deriveGiftQuery(occasion, notes),
        maxPrice: budgetLKR,
        deliverTo: city,
        deliverBy: date,
        sort: "bestseller",
        limit: 8,
      });
      if ("error" in res) return res;
      const pick = chooseBestGift(res.products, budgetLKR);
      if (!pick) {
        return {
          error: `Nothing in the catalogue fits Rs ${budgetLKR} and can reach ${city} by ${date}. Suggest widening the budget or moving the date.`,
        };
      }
      return {
        proposal: {
          product: pick,
          alternates: res.products.filter((p) => p.id !== pick.id).slice(0, 3),
          occasion,
          date,
          city,
          recipientName: recipientName ?? null,
          budgetLKR,
          rationale: buildGiftRationale(pick, budgetLKR, city, date),
        },
        deliveryContext: res.deliveryContext,
      };
    },
    toModelOutput: ({ output }) => ({ type: "text", value: planGiftToModel(output) }),
  }),

  visualSearch: tool({
    description:
      "Find catalog products that VISUALLY match a photo the shopper just uploaded (an inspiration image — a cake they saw, a dress, a gadget). Call this whenever an image is attached this turn; do NOT ask them to describe it. Embeds the photo and ranks real Kapruka products by visual similarity, returning ranked cards the interface renders. Pass deliverTo/deliverBy if you already know where it's going.",
    inputSchema: z.object({
      // gpt-oss-120b tends to send `null` for unfilled optionals, which strict
      // tool-schema validation rejects — accept nullish and coerce below.
      hint: z
        .string()
        .nullish()
        .describe("Any words the shopper typed alongside the image (budget, occasion, colour)."),
      deliverTo: z.string().nullish().describe("Destination city, if known, for delivery confidence."),
      deliverBy: z.string().nullish().describe("Target delivery date YYYY-MM-DD, if known."),
      rationale: z
        .string()
        .max(160)
        .nullish()
        .describe("Optional ONE short line on why these match the photo (shown above the cards)."),
    }),
    execute: async ({ hint, deliverTo, deliverBy, rationale }) => {
      if (!ctx.imageDataUrl) {
        return { error: "No image was attached this turn — ask the shopper to upload one." };
      }
      const res = await visualSearch({
        imageDataUrl: ctx.imageDataUrl,
        hint: hint ?? undefined,
        deliverTo: deliverTo ?? undefined,
        deliverBy: deliverBy ?? undefined,
      });
      return rationale && !("error" in res) ? { ...res, rationale } : res;
    },
    toModelOutput: ({ output }) => ({ type: "text", value: visualResultToModel(output) }),
  }),
  };
}

// --- planGift helpers -------------------------------------------------------

const GIFT_DELIVERY_RANK: Record<string, number> = {
  fresh: 0,
  deliverable: 1,
  outstation: 2,
  unavailable: 3,
};

/** Turn a free-text occasion (+ optional hints) into a broad, catalogue-friendly query. */
function deriveGiftQuery(occasion: string, notes?: string | null): string {
  const hint = (notes ?? "").trim();
  if (hint.length >= 3) return hint.slice(0, 60);
  const o = occasion.toLowerCase();
  if (/sympath|funeral|condol|bereave/.test(o)) return "flowers";
  if (/birthday|anniversar|congrat|celebrat|wedding|valentine/.test(o)) return "gift hamper";
  return "gift";
}

/** Best in-budget, deliverable, in-stock pick — prefer the strongest delivery verdict. */
function chooseBestGift(products: kapruka.Product[], budgetLKR: number): kapruka.Product | null {
  const affordable = products.filter(
    (p) =>
      p.inStock &&
      typeof p.price?.amount === "number" &&
      p.price.amount <= budgetLKR &&
      (p.delivery?.status ?? "deliverable") !== "unavailable",
  );
  if (!affordable.length) return null;
  // Stable sort by delivery verdict; within a verdict the catalogue (bestseller) order holds.
  return [...affordable].sort(
    (a, b) =>
      (GIFT_DELIVERY_RANK[a.delivery?.status ?? "deliverable"] ?? 1) -
      (GIFT_DELIVERY_RANK[b.delivery?.status ?? "deliverable"] ?? 1),
  )[0];
}

/** One warm line the proposal card and model both use to justify the pick. */
function buildGiftRationale(
  p: kapruka.Product,
  budgetLKR: number,
  city: string,
  date: string,
): string {
  const price = p.price?.amount;
  const within =
    typeof price === "number"
      ? `Rs ${price.toLocaleString("en-LK")} — comfortably within your Rs ${budgetLKR.toLocaleString("en-LK")}`
      : "within your budget";
  const arrive = p.delivery?.label ? ` (${p.delivery.label})` : "";
  return `${within}, and it reaches ${city} by ${date}${arrive}.`;
}

/** Image-less tool set — used only for client-side type inference. */
export const auraTools = makeAuraTools();

export type AuraTools = ReturnType<typeof makeAuraTools>;

/** Tools every shopper can call, regardless of tier. */
const ALWAYS_ON_TOOLS: ReadonlySet<keyof AuraTools> = new Set([
  "searchProducts",
  "compareProducts",
  "getProduct",
  "listCategories",
  "listDeliveryCities",
  "checkDelivery",
  "createOrder",
  "trackOrder",
  "visualSearch",
  "askChoice",
]);

/**
 * Narrow the full tool set down to what the shopper's tier may actually call.
 *
 * INVARIANT: `makeAuraTools` always DEFINES every tool (so the compile-time
 * `InferUITools` union — and thus `AuraUIMessage` — stays a constant superset).
 * This filters which tools are PASSED to the model at runtime; a tool that's
 * absent simply never gets invoked, and the client only ever renders parts that
 * actually arrive, so a narrowed runtime set can never break the typed client.
 *
 * - `planGift` (Autonomous Concierge) is added only for Diamond+ — below that
 *   tier the model literally cannot call it.
 */
export function gateTools(tools: AuraTools, ctx: { orderCount?: number }): AuraTools {
  const allowed = new Set<keyof AuraTools>(ALWAYS_ON_TOOLS);
  if (hasPerk(ctx.orderCount, TIER_GATES.autonomousConcierge)) allowed.add("planGift");

  const out: Partial<Record<keyof AuraTools, AuraTools[keyof AuraTools]>> = {};
  for (const key of Object.keys(tools) as (keyof AuraTools)[]) {
    if (allowed.has(key)) out[key] = tools[key];
  }
  // Runtime-narrowed, compile-time type preserved — see the invariant above.
  return out as AuraTools;
}
