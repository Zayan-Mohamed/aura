/**
 * Compact, token-lean renderings of tool results for the *model* to read.
 *
 * The rich `Product` objects we return from tools (lib/tools.ts) carry long
 * image/CDN URLs, `images[]` galleries and full descriptions - everything the
 * UI needs to render cards, but mostly dead weight to the model, which only
 * reasons over id / name / price / stock / delivery. Those payloads get
 * re-sent on every step of the agentic loop (stepCountIs(6)), so they were the
 * single biggest driver of Groq token spend.
 *
 * AI SDK 6 tools support `toModelOutput`, which lets us keep returning the full
 * objects (the UI still renders them as the tool part `output`) while handing
 * the model a stripped, TOON-style tabular text instead of the raw JSON. The
 * URL/gallery fields never reach the model at all.
 */
import type { Product, DeliveryContext } from "./kapruka";

type VisualProduct = Product & { matchScore?: number };

/** CSV/TOON-style cell: quote only when the value contains a comma/quote/newline. */
function cell(v: string | number | null | undefined): string {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function stockOf(p: Product): string {
  if (!p.inStock) return "out";
  return typeof p.stockLevel === "string" ? p.stockLevel : "yes";
}

function deliveryOf(p: Product): string {
  if (!p.delivery) return "";
  return p.delivery.label ? `${p.delivery.status}:${p.delivery.label}` : p.delivery.status;
}

/** One TOON table of products. `scored` adds a match% column for visual search. */
function productsTable(products: Product[], scored = false): string {
  const fields = scored
    ? "id,name,priceLKR,wasLKR,stock,delivery,match%"
    : "id,name,priceLKR,wasLKR,stock,delivery";
  const rows = products.map((p) => {
    const base = [
      p.id,
      p.name,
      p.price?.amount ?? "",
      p.compareAtPrice?.amount ?? "",
      stockOf(p),
      deliveryOf(p),
    ];
    if (scored) {
      base.push(Math.round(((p as VisualProduct).matchScore ?? 0) * 100));
    }
    return base.map(cell).join(",");
  });
  return `products[${products.length}]{${fields}}:\n${rows.join("\n")}`;
}

function contextLine(ctx?: DeliveryContext): string {
  if (!ctx) return "";
  const parts = [ctx.city, ctx.dateLabel ?? ctx.date].filter(Boolean).join(" · ");
  const counts = `${ctx.deliverableCount} deliverable${
    ctx.hiddenCount ? `, ${ctx.hiddenCount} hidden (can't arrive in time)` : ""
  }`;
  return `delivery: ${parts} - ${counts}`;
}

// Cards already show images, links and full copy - keep telling the model not
// to repeat them (reinforces the no-wall-of-text rule right at the data source).
const CARDS_NOTE =
  "(The shopper already sees these as rich cards - images, prices and links included. Don't repeat them in prose.)";

function isErr(o: unknown): o is { error: string } {
  return !!o && typeof o === "object" && "error" in o;
}

/** searchProducts → compact text for the model. */
export function searchResultToModel(output: unknown): string {
  if (isErr(output)) return `error: ${output.error}`;
  const o = output as {
    products: Product[];
    query?: string;
    relaxed?: boolean;
    effectiveQuery?: string;
    deliveryContext?: DeliveryContext;
  };
  if (!o.products?.length) {
    return `No products found for "${o.query ?? ""}". Offer a simpler query or categories.`;
  }
  const head = o.relaxed
    ? `query: "${o.query}" had no exact match - relaxed to "${o.effectiveQuery}"; these are the CLOSEST finds (say so).`
    : `query: "${o.query ?? ""}"`;
  return [head, contextLine(o.deliveryContext), productsTable(o.products), CARDS_NOTE]
    .filter(Boolean)
    .join("\n");
}

/** visualSearch → compact text for the model. */
export function visualResultToModel(output: unknown): string {
  if (isErr(output)) return `error: ${output.error}`;
  const o = output as {
    products: VisualProduct[];
    caption?: string;
    verdict?: string;
    deliveryContext?: DeliveryContext;
  };
  if (!o.products?.length) return "No visual matches found.";
  const head = `image read as: "${o.caption ?? ""}" · verdict: ${o.verdict ?? "similar"}`;
  return [head, contextLine(o.deliveryContext), productsTable(o.products, true), CARDS_NOTE]
    .filter(Boolean)
    .join("\n");
}

/** compareProducts → compact comparison table for the model. */
export function compareResultToModel(output: unknown): string {
  if (isErr(output)) return `error: ${output.error}`;
  const o = output as { products: Product[]; verdict?: string };
  if (!o.products?.length) return "No products to compare.";
  return [
    `comparing ${o.products.length} products:`,
    productsTable(o.products),
    o.verdict ? `your verdict (shown to shopper): ${o.verdict}` : "",
    CARDS_NOTE,
  ]
    .filter(Boolean)
    .join("\n");
}

/** planGift → compact text: the chosen pick, why, and a few alternates. */
export function planGiftToModel(output: unknown): string {
  if (isErr(output)) return `error: ${output.error}`;
  const o = output as {
    proposal?: {
      product: Product;
      alternates?: Product[];
      occasion: string;
      date: string;
      city: string;
      budgetLKR: number;
      rationale?: string;
    };
    deliveryContext?: DeliveryContext;
  };
  if (!o.proposal) return "No in-budget, deliverable gift could be assembled.";
  const p = o.proposal;
  return [
    `gift proposal for ${p.occasion} → ${p.city} by ${p.date}, budget Rs ${p.budgetLKR}:`,
    `pick: ${p.product.id} "${p.product.name}" - Rs ${p.product.price?.amount ?? "?"}${
      deliveryOf(p.product) ? ` (${deliveryOf(p.product)})` : ""
    }`,
    p.rationale ? `why: ${p.rationale}` : "",
    contextLine(o.deliveryContext),
    p.alternates?.length ? `alternates:\n${productsTable(p.alternates)}` : "",
    CARDS_NOTE,
  ]
    .filter(Boolean)
    .join("\n");
}

/** getProduct → compact text, but KEEP the description (the model elaborates from it). */
export function productDetailToModel(output: unknown): string {
  if (isErr(output)) return `error: ${output.error}`;
  const p = (output as { product: Product }).product;
  if (!p) return "error: no product";
  const about = (p.description || p.summary || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 600);
  return [
    `product ${p.id}: "${p.name}"`,
    `priceLKR: ${p.price?.amount ?? "?"}${
      p.compareAtPrice?.amount ? ` (was ${p.compareAtPrice.amount})` : ""
    }`,
    `stock: ${stockOf(p)}`,
    deliveryOf(p) ? `delivery: ${deliveryOf(p)}` : "",
    p.categoryName ? `category: ${p.categoryName}` : "",
    about ? `about: ${about}` : "",
    CARDS_NOTE,
  ]
    .filter(Boolean)
    .join("\n");
}
