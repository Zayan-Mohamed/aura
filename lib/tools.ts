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
import * as kapruka from "./kapruka";

export const auraTools = {
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
    }),
    execute: async (args) => kapruka.searchProducts(args),
  }),

  getProduct: tool({
    description:
      "Fetch full details for a single product by its Kapruka product ID, including the full image gallery and description. Use when the shopper wants a closer look at one item, or before creating an order.",
    inputSchema: z.object({
      productId: z.string().describe("Kapruka product ID, e.g. 'FLOWERS00T2089'."),
    }),
    execute: async ({ productId }) => kapruka.getProduct(productId),
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
      "Look up the status and delivery timeline of a paid Kapruka order by its order number (from the confirmation email — NOT the pre-payment order_ref).",
    inputSchema: z.object({
      orderNumber: z.string().describe("Kapruka order number, e.g. 'VIMP34456CB2'."),
    }),
    execute: async ({ orderNumber }) => kapruka.trackOrder(orderNumber),
  }),
};

export type AuraTools = typeof auraTools;
