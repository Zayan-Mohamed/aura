/**
 * Kapruka MCP integration layer.
 *
 * All catalog/commerce data flows through Kapruka's public MCP server over the
 * Streamable HTTP transport. There is no local product DB. This module owns:
 *   - a single, reused MCP connection (cached across requests + HMR)
 *   - typed fetchers that request JSON, parse the `{ result }` envelope, and
 *     normalize into clean camelCase shapes the UI can render directly
 *   - a 30-minute TTL cache mirroring the server-side read cache, to stay well
 *     under the 60 req/min rate limit
 *   - graceful degradation: every fetcher resolves (never throws) so a flaky
 *     network or rate-limit returns a typed `{ error }` the agent can narrate.
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const KAPRUKA_MCP_URL = "https://mcp.kapruka.com/mcp";

// ---------------------------------------------------------------------------
// Normalized types (what the UI renders)
// ---------------------------------------------------------------------------

export type Money = { amount: number | null; currency: string };

/**
 * Per-product delivery verdict, attached by a delivery-aware search.
 *  - fresh:       perishable that arrives fresh on the chosen date
 *  - deliverable: non-perishable that reaches the city fine
 *  - outstation:  reaches the city but freshness/timing isn't guaranteed
 *  - unavailable: can't be delivered to the city/date (hidden from the carousel)
 */
export type DeliveryStatus = "fresh" | "deliverable" | "outstation" | "unavailable";

export type ProductDelivery = {
  status: DeliveryStatus;
  label: string;
  note?: string;
};

export type Product = {
  id: string;
  name: string;
  summary?: string;
  description?: string;
  price: Money;
  compareAtPrice?: Money | null;
  inStock: boolean;
  stockLevel?: "low" | "medium" | "high" | string;
  imageUrl?: string;
  images?: string[];
  categoryName?: string;
  shipsInternationally?: boolean;
  url: string;
  delivery?: ProductDelivery;
};

/** Summary banner shown above a delivery-aware product carousel. */
export type DeliveryContext = {
  city: string;
  date: string | null;
  dateLabel: string | null;
  rate: number;
  currency: string;
  available: boolean;
  deliverableCount: number;
  hiddenCount: number;
  nextAvailableDate?: string | null;
};

export type Category = { name: string; url: string };

export type City = { name: string; aliases: string[] };

export type DeliveryResult = {
  city: string;
  checkedDate: string;
  available: boolean;
  rate: number;
  currency: string;
  reason?: string | null;
  nextAvailableDate?: string | null;
  perishableWarning?: string | null;
};

export type OrderSummary = {
  itemsTotal: number;
  deliveryFee: number;
  addonsTotal: number;
  grandTotal: number;
  currency: string;
};

export type OrderConfirmation = {
  checkoutUrl: string;
  orderRef: string;
  summary: OrderSummary;
  expiresAt: string;
};

export type OrderTracking = {
  orderNumber: string;
  status: string;
  statusDisplay: string;
  orderDate: string;
  deliveryDate: string;
  shippedDate?: string | null;
  amount: string;
  paymentMethod: string;
  recipient: { name: string; phone: string; address: string; city: string };
  greetingMessage?: string | null;
  progress: { step: string; timestamp: string }[];
  liveTrackingAvailable: boolean;
  hasDeliveryPhoto: boolean;
  hasDeliveryVideo: boolean;
  items: { productId: string; name: string; quantity: number }[];
};

export type Failable<T> = T & { error?: never } | { error: string };

// ---------------------------------------------------------------------------
// Connection (singleton, HMR-safe)
// ---------------------------------------------------------------------------

type Glob = typeof globalThis & {
  __kaprukaClient?: Promise<Client>;
  __kaprukaCache?: Map<string, { at: number; value: unknown }>;
};
const g = globalThis as Glob;

async function getClient(): Promise<Client> {
  if (!g.__kaprukaClient) {
    g.__kaprukaClient = (async () => {
      const transport = new StreamableHTTPClientTransport(new URL(KAPRUKA_MCP_URL));
      const client = new Client(
        { name: "project-aura", version: "1.0.0" },
        { capabilities: {} },
      );
      await client.connect(transport);
      return client;
    })().catch((err) => {
      // Allow a later retry if the first connect fails.
      g.__kaprukaClient = undefined;
      throw err;
    });
  }
  return g.__kaprukaClient;
}

// ---------------------------------------------------------------------------
// 30-minute read cache (mirrors Kapruka's server-side cache)
// ---------------------------------------------------------------------------

const TTL_MS = 30 * 60 * 1000;
function cache() {
  return (g.__kaprukaCache ??= new Map());
}
function cacheKey(tool: string, params: unknown) {
  return `${tool}:${JSON.stringify(params)}`;
}

// ---------------------------------------------------------------------------
// Low-level call + envelope parsing
// ---------------------------------------------------------------------------

function isRateLimit(message: string) {
  return /rate.?limit|429|too many requests/i.test(message);
}

/**
 * Calls an MCP tool and unwraps Kapruka's `{ result: <string> }` envelope.
 * Returns a parsed object/array, or a string when the payload is a plain
 * message (e.g. "No products found ..."). Throws on transport errors.
 */
async function rawCall(name: string, params: Record<string, unknown>): Promise<unknown> {
  const client = await getClient();
  const res = (await client.callTool({ name, arguments: { params } })) as {
    content?: { type: string; text?: string }[];
    isError?: boolean;
  };
  const text = res?.content?.find((c) => c.type === "text")?.text ?? "";
  if (res?.isError) throw new Error(text || "Kapruka tool error");

  // Outer envelope: { "result": <string|object> }
  let payload: unknown = text;
  try {
    const outer = JSON.parse(text);
    payload = outer && typeof outer === "object" && "result" in outer ? (outer as { result: unknown }).result : outer;
  } catch {
    /* not JSON — keep raw text */
  }
  // Inner value is often itself a JSON string.
  if (typeof payload === "string") {
    const trimmed = payload.trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        return JSON.parse(trimmed);
      } catch {
        /* fall through to return the string */
      }
    }
  }
  return payload;
}

async function cachedCall(name: string, params: Record<string, unknown>): Promise<unknown> {
  const key = cacheKey(name, params);
  const hit = cache().get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value;
  const value = await rawCall(name, params);
  cache().set(key, { at: Date.now(), value });
  return value;
}

function toError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (isRateLimit(msg)) {
    return "Kapruka is a touch busy right now (rate limit reached). Give me a moment and try again.";
  }
  return "I couldn't reach Kapruka's catalog just now. Mind trying that again in a moment?";
}

// ---------------------------------------------------------------------------
// Normalizers
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-explicit-any */
function normalizeProduct(p: Record<string, any>): Product {
  return {
    id: String(p.id ?? ""),
    name: String(p.name ?? "Untitled"),
    summary: p.summary ?? undefined,
    description: p.description ?? undefined,
    price: {
      amount: p.price?.amount ?? null,
      currency: p.price?.currency ?? "LKR",
    },
    compareAtPrice: p.compare_at_price
      ? { amount: p.compare_at_price.amount, currency: p.compare_at_price.currency }
      : null,
    inStock: Boolean(p.in_stock),
    stockLevel: p.stock_level ?? undefined,
    imageUrl: p.image_url ?? (Array.isArray(p.images) ? p.images[0] : undefined),
    images: Array.isArray(p.images) ? p.images : p.image_url ? [p.image_url] : undefined,
    categoryName: p.category?.name ?? undefined,
    shipsInternationally: p.ships_internationally ?? p.shipping?.ships_internationally ?? undefined,
    url: String(p.url ?? "#"),
  };
}

// ---------------------------------------------------------------------------
// Public fetchers — each resolves to data or `{ error }`
// ---------------------------------------------------------------------------

export type SearchArgs = {
  q: string;
  category?: string;
  limit?: number;
  minPrice?: number;
  maxPrice?: number;
  sort?: string;
  currency?: string;
  /** Destination city — enables Proactive Delivery Confidence when set. */
  deliverTo?: string;
  /** Target delivery date YYYY-MM-DD (Asia/Colombo). Pairs with deliverTo. */
  deliverBy?: string;
};

// Perishables are the items whose value collapses if they arrive late —
// the heart of the Sri Lankan delivery-anxiety problem. Detected by name/category.
const PERISHABLE_RE =
  /\b(cake|gateau|gâteau|cupcake|pastry|pastries|macaron|dessert|flower|floral|bouquet|rose|petal|wreath|fresh\s*cream|fruit\s*basket|fruits?\b)/i;

function isPerishable(p: Product): boolean {
  return PERISHABLE_RE.test(`${p.name} ${p.categoryName ?? ""}`);
}

// Friendly short date like "Sat 14" in Sri Lanka time, or null if unparseable.
function friendlyDate(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00+05:30`);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("en-LK", {
    weekday: "short",
    day: "numeric",
    timeZone: "Asia/Colombo",
  }).format(d);
}

// How many perishables we'll individually freshness-check, to respect the
// 60 req/min MCP limit (the 30-min cache absorbs repeats). Non-perishables and
// any perishables beyond this cap fall back to the city-level verdict.
const PERISHABLE_CHECK_CAP = 8;

/**
 * Cross-references a freshly-searched product list against real delivery
 * feasibility for a destination city/date, returning each product annotated
 * with a delivery verdict plus a summary context. Items that can't arrive are
 * filtered out (and counted in `hiddenCount`).
 */
async function annotateDelivery(
  products: Product[],
  city: string,
  deliveryDate: string | undefined,
  currency: string,
): Promise<{ products: Product[]; context: DeliveryContext } | null> {
  const base = await checkDelivery({ city, deliveryDate });
  if ("error" in base) return null; // couldn't check — degrade to a plain list

  const dateLabel = friendlyDate(deliveryDate ?? base.checkedDate);
  const arriveLabel = dateLabel ? `Delivers ${dateLabel}` : "Delivers";

  // City itself unavailable on that date → nothing can arrive.
  if (!base.available) {
    return {
      products: [],
      context: {
        city: base.city,
        date: deliveryDate ?? null,
        dateLabel,
        rate: base.rate,
        currency: base.currency || currency,
        available: false,
        deliverableCount: 0,
        hiddenCount: products.length,
        nextAvailableDate: base.nextAvailableDate ?? null,
      },
    };
  }

  let checks = 0;
  const annotated = await Promise.all(
    products.map(async (p): Promise<Product> => {
      if (!isPerishable(p)) {
        return { ...p, delivery: { status: "deliverable", label: arriveLabel } };
      }
      // Perishable: individually verify freshness while under the cap.
      if (checks < PERISHABLE_CHECK_CAP) {
        checks += 1;
        const item = await checkDelivery({ city, deliveryDate, productId: p.id });
        if (!("error" in item)) {
          if (!item.available) {
            return {
              ...p,
              delivery: {
                status: "unavailable",
                label: "Can’t arrive fresh",
                note: item.perishableWarning ?? item.reason ?? undefined,
              },
            };
          }
          if (item.perishableWarning) {
            return {
              ...p,
              delivery: {
                status: "outstation",
                label: dateLabel ? `${dateLabel} · freshness varies` : "Freshness varies",
                note: item.perishableWarning,
              },
            };
          }
          return {
            ...p,
            delivery: {
              status: "fresh",
              label: dateLabel ? `${arriveLabel} · fresh` : "Guaranteed fresh",
            },
          };
        }
      }
      // Beyond cap or check failed — fall back to the city verdict, flagged cautiously.
      return {
        ...p,
        delivery: { status: "outstation", label: arriveLabel, note: "Freshness not individually verified." },
      };
    }),
  );

  const visible = annotated.filter((p) => p.delivery?.status !== "unavailable");
  return {
    products: visible,
    context: {
      city: base.city,
      date: deliveryDate ?? null,
      dateLabel,
      rate: base.rate,
      currency: base.currency || currency,
      available: true,
      deliverableCount: visible.length,
      hiddenCount: annotated.length - visible.length,
      nextAvailableDate: base.nextAvailableDate ?? null,
    },
  };
}

// --- Query Relaxation -------------------------------------------------------
// Kapruka's search matches keywords fairly strictly, so an over-specific phrase
// ("chocolate birthday cake") can return zero results while the head noun
// ("cake") returns plenty. We fall back to progressively broader queries, then
// locally re-rank the broad set by the dropped terms so the closest items lead.

const STOPWORDS = new Set([
  "a", "an", "the", "some", "any", "for", "with", "of", "to", "my", "me", "i",
  "please", "want", "need", "looking", "good", "nice", "best", "buy", "get",
  "show", "find", "under", "below", "cheap", "and", "or",
]);

/** Progressively broader fallback queries, broadest last (head noun trails in English). */
function relaxQueries(q: string): string[] {
  const words = q.trim().split(/\s+/).filter(Boolean);
  if (words.length <= 1) return [];
  const out: string[] = [];
  if (words.length >= 3) out.push(words.slice(-2).join(" ")); // last two words
  out.push(words[words.length - 1]); // head noun
  // Also try the most "contentful" single word (longest non-stopword) as a hail-mary.
  const content = words
    .filter((w) => !STOPWORDS.has(w.toLowerCase()) && w.length > 2)
    .sort((a, b) => b.length - a.length)[0];
  if (content) out.push(content);
  return [...new Set(out.map((s) => s.toLowerCase()))].filter((f) => f !== q.toLowerCase());
}

/** Re-rank a broad result set so items matching the user's specific terms lead. */
function rankByTerms(products: Product[], terms: string[]): Product[] {
  const t = terms.map((x) => x.toLowerCase()).filter((x) => x.length > 2 && !STOPWORDS.has(x));
  if (!t.length) return products;
  const scored = products.map((p, i) => {
    const hay = `${p.name} ${p.description ?? ""} ${p.categoryName ?? ""}`.toLowerCase();
    return { p, i, hits: t.filter((term) => hay.includes(term)).length };
  });
  // Stable sort: more term-hits first, original order as tiebreak.
  return scored.sort((a, b) => b.hits - a.hits || a.i - b.i).map((s) => s.p);
}

async function rawSearch(args: SearchArgs, q: string): Promise<Product[] | null> {
  const data = (await cachedCall("kapruka_search_products", {
    q,
    category: args.category ?? null,
    limit: Math.min(args.limit ?? 8, 12),
    min_price: args.minPrice ?? null,
    max_price: args.maxPrice ?? null,
    sort: args.sort ?? "relevance",
    currency: args.currency ?? "LKR",
    response_format: "json",
  })) as any;
  if (typeof data === "string") return null; // "No products found ..."
  const results = Array.isArray(data?.results) ? data.results : [];
  return results.map(normalizeProduct) as Product[];
}

export async function searchProducts(
  args: SearchArgs,
): Promise<
  Failable<{
    products: Product[];
    query: string;
    deliveryContext?: DeliveryContext;
    relaxed?: boolean;
    effectiveQuery?: string;
  }>
> {
  try {
    let products = (await rawSearch(args, args.q)) ?? [];
    let effectiveQuery = args.q;
    let relaxed = false;

    // Nothing for the exact phrase → walk progressively broader queries.
    if (products.length === 0) {
      for (const fallback of relaxQueries(args.q)) {
        const broad = await rawSearch(args, fallback);
        if (broad && broad.length) {
          // Surface the items closest to what they actually asked for.
          products = rankByTerms(broad, args.q.split(/\s+/));
          effectiveQuery = fallback;
          relaxed = true;
          break;
        }
      }
    }

    if (products.length === 0) return { products: [], query: args.q };

    // Proactive Delivery Confidence: when a destination is known, only surface
    // what can actually arrive, each stamped with a freshness/ETA verdict.
    if (args.deliverTo) {
      const annotated = await annotateDelivery(
        products,
        args.deliverTo,
        args.deliverBy,
        args.currency ?? "LKR",
      );
      if (annotated) {
        return {
          products: annotated.products,
          query: args.q,
          deliveryContext: annotated.context,
          relaxed,
          effectiveQuery,
        };
      }
    }

    return { products, query: args.q, relaxed, effectiveQuery };
  } catch (err) {
    return { error: toError(err) };
  }
}

export async function getProduct(
  productId: string,
  currency = "LKR",
): Promise<Failable<{ product: Product }>> {
  try {
    const data = (await cachedCall("kapruka_get_product", {
      product_id: productId,
      currency,
      response_format: "json",
    })) as any;
    if (typeof data === "string") return { error: data };
    return { product: normalizeProduct(data) };
  } catch (err) {
    return { error: toError(err) };
  }
}

export async function listCategories(): Promise<Failable<{ categories: Category[] }>> {
  try {
    const data = (await cachedCall("kapruka_list_categories", {
      depth: 1,
      response_format: "json",
    })) as any;
    const categories = Array.isArray(data?.categories)
      ? data.categories.map((c: any) => ({ name: String(c.name), url: String(c.url) }))
      : [];
    return { categories };
  } catch (err) {
    return { error: toError(err) };
  }
}

export async function listDeliveryCities(
  query?: string,
): Promise<Failable<{ cities: City[] }>> {
  try {
    const data = (await cachedCall("kapruka_list_delivery_cities", {
      query: query ?? null,
      limit: 25,
      response_format: "json",
    })) as any;
    const cities = Array.isArray(data?.cities)
      ? data.cities.map((c: any) => ({ name: String(c.name), aliases: c.aliases ?? [] }))
      : [];
    return { cities };
  } catch (err) {
    return { error: toError(err) };
  }
}

export async function checkDelivery(args: {
  city: string;
  deliveryDate?: string;
  productId?: string;
}): Promise<Failable<DeliveryResult>> {
  try {
    const data = (await cachedCall("kapruka_check_delivery", {
      city: args.city,
      delivery_date: args.deliveryDate ?? null,
      product_id: args.productId ?? null,
      response_format: "json",
    })) as any;
    if (typeof data === "string") return { error: data };
    return {
      city: data.city,
      checkedDate: data.checked_date,
      available: Boolean(data.available),
      rate: Number(data.rate ?? 0),
      currency: data.currency ?? "LKR",
      reason: data.reason ?? null,
      nextAvailableDate: data.next_available_date ?? null,
      perishableWarning: data.perishable_warning ?? null,
    };
  } catch (err) {
    return { error: toError(err) };
  }
}

export type CreateOrderArgs = {
  cart: { productId: string; quantity?: number; icingText?: string }[];
  recipient: { name: string; phone: string };
  delivery: {
    address: string;
    city: string;
    date: string;
    locationType?: string;
    instructions?: string;
  };
  sender: { name: string; anonymous?: boolean };
  giftMessage?: string;
  currency?: string;
};

export async function createOrder(
  args: CreateOrderArgs,
): Promise<Failable<OrderConfirmation>> {
  try {
    // Orders are never cached — always a fresh call.
    const data = (await rawCall("kapruka_create_order", {
      cart: args.cart.map((i) => ({
        product_id: i.productId,
        quantity: i.quantity ?? 1,
        icing_text: i.icingText ?? null,
      })),
      recipient: args.recipient,
      delivery: {
        address: args.delivery.address,
        city: args.delivery.city,
        date: args.delivery.date,
        location_type: args.delivery.locationType ?? "house",
        instructions: args.delivery.instructions ?? null,
      },
      sender: { name: args.sender.name, anonymous: args.sender.anonymous ?? false },
      gift_message: args.giftMessage ?? null,
      currency: args.currency ?? "LKR",
      response_format: "json",
    })) as any;
    if (typeof data === "string") return { error: data };
    return {
      checkoutUrl: data.checkout_url,
      orderRef: data.order_ref,
      summary: {
        itemsTotal: data.summary?.items_total ?? 0,
        deliveryFee: data.summary?.delivery_fee ?? 0,
        addonsTotal: data.summary?.addons_total ?? 0,
        grandTotal: data.summary?.grand_total ?? 0,
        currency: data.summary?.currency ?? "LKR",
      },
      expiresAt: data.expires_at,
    };
  } catch (err) {
    return { error: toError(err) };
  }
}

export async function trackOrder(
  orderNumber: string,
): Promise<Failable<OrderTracking>> {
  try {
    const data = (await rawCall("kapruka_track_order", {
      order_number: orderNumber,
      response_format: "json",
    })) as any;
    if (typeof data === "string") return { error: data };
    return {
      orderNumber: data.order_number,
      status: data.status,
      statusDisplay: data.status_display,
      orderDate: data.order_date,
      deliveryDate: data.delivery_date,
      shippedDate: data.shipped_date ?? null,
      amount: data.amount,
      paymentMethod: data.payment_method,
      recipient: data.recipient,
      greetingMessage: data.greeting_message ?? null,
      progress: Array.isArray(data.progress) ? data.progress : [],
      liveTrackingAvailable: Boolean(data.live_tracking_available),
      hasDeliveryPhoto: Boolean(data.has_delivery_photo),
      hasDeliveryVideo: Boolean(data.has_delivery_video),
      items: Array.isArray(data.items) ? data.items : [],
    };
  } catch (err) {
    return { error: toError(err) };
  }
}
