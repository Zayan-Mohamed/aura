/**
 * Proactive Visual Search pipeline.
 *
 *   shopper photo
 *     → Gemini 2.5 Flash (vision) captions it → broad catalog query
 *     → Kapruka search (query-relaxation built in) → candidate products
 *     → Voyage multimodal-3 embeds the photo + candidate images (one shared space)
 *     → pgvector ranks candidates by cosine similarity
 *     → threshold verdict ("exact match" vs "closest visual matches")
 *
 * The chat model never sees the image - it just calls the visualSearch tool and
 * narrates the ranked cards the interface renders. Server-only (imported solely
 * by lib/tools.ts).
 */
import { z } from "zod";
import { generateObject, type LanguageModel } from "ai";
import { createGroq } from "@ai-sdk/groq";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import * as kapruka from "./kapruka";
import type { Product, DeliveryContext } from "./kapruka";
import { embed, toVectorLiteral, type EmbedInput } from "./embeddings";
import { rpcClient } from "./supabase/rpc-client";

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });
const google = process.env.GOOGLE_GEMINI_KEY
  ? createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_GEMINI_KEY })
  : null;

// Vision captioner. Groq is decommissioning its only multimodal model
// (Llama-4 Scout, EOL 2026-07-17) and its recommended replacements are
// text-only, so we caption with Google Gemini (multimodal, free tier) whenever
// its key is present, and only fall back to Groq Scout while it still exists.
function visionModel(): LanguageModel {
  return google
    ? google(process.env.GEMINI_VISION_MODEL ?? "gemini-2.5-flash")
    : groq(process.env.GROQ_VISION_MODEL ?? "meta-llama/llama-4-scout-17b-16e-instruct");
}

// Cosine bands, calibrated for Voyage multimodal-3 (2026-06-12). Its image↔image
// cosines run much LOWER than CLIP: same-category (cake photo vs catalog cakes)
// clustered ~0.35-0.44, so "similar" sits at 0.30 and "exact" well above the
// same-category ceiling (only a genuine near-identical hit qualifies).
const EXACT_THRESHOLD = 0.65;
const SIMILAR_THRESHOLD = 0.3;

// How many catalog candidates we embed + rank per search ("clippings"). The
// challenge demo runs entirely on free tier: Voyage (no payment method) caps us
// at 3 RPM / 10K tokens-per-min, and catalog images are pixel-costly. A small,
// curated set is the deliberate choice - it embeds in ONE request that fits well
// under 10K TPM, and a tight ranked carousel reads more "concierge" than a grid.
// If Voyage is unavailable/throttled we still show these candidates unranked
// (see the fallback below), so a quota hit never dead-ends the shopper.
// Mirrors match_product_embeddings' p_limit.
const CANDIDATE_LIMIT = 5;

export type VisualVerdict = "exact" | "similar" | "loose" | "none";
export type VisualMatch = Product & { matchScore?: number };

export type VisualSearchResult = {
  caption: string;
  query: string;
  verdict: VisualVerdict;
  topScore: number;
  products: VisualMatch[];
  deliveryContext?: DeliveryContext;
  relaxed?: boolean;
};

const captionSchema = z.object({
  query: z
    .string()
    .describe(
      "A BROAD 1-2 word catalog search term - the head noun only, e.g. 'cake', 'saree', 'headphones', 'watch'. No adjectives.",
    ),
  terms: z
    .array(z.string())
    .max(6)
    .describe("Distinctive visual attributes: colours, style, occasion, material."),
});

async function captionImage(
  imageDataUrl: string,
  hint?: string,
): Promise<{ query: string; terms: string[] }> {
  try {
    const { object } = await generateObject({
      model: visionModel(),
      schema: captionSchema,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text:
                "Identify this product so it can be found in a Sri Lankan e-commerce catalog (Kapruka). " +
                "Return a BROAD head-noun search query plus distinctive attribute terms." +
                (hint ? ` The shopper also said: "${hint}".` : ""),
            },
            { type: "image", image: imageDataUrl },
          ],
        },
      ],
    });
    const query = (object.query || "").trim() || (hint?.trim() ?? "gift");
    return { query, terms: object.terms ?? [] };
  } catch {
    // Caption failed - fall back to the hint or a safe generic noun.
    return { query: (hint?.trim() || "gift"), terms: [] };
  }
}

function verdictFor(score: number): VisualVerdict {
  if (score >= EXACT_THRESHOLD) return "exact";
  if (score >= SIMILAR_THRESHOLD) return "similar";
  if (score > 0) return "loose";
  return "none";
}

export async function visualSearch(args: {
  imageDataUrl: string;
  hint?: string;
  deliverTo?: string;
  deliverBy?: string;
}): Promise<VisualSearchResult | { error: string }> {
  try {
    if (!process.env.VOYAGE_API_KEY) {
      return { error: "Visual search isn't configured yet (missing VOYAGE_API_KEY)." };
    }

    // 1) Caption → broad head-noun query (keeps the candidate pool wide).
    const { query, terms } = await captionImage(args.imageDataUrl, args.hint);
    const caption = [query, ...terms].join(" ").trim();

    // 2) Broad catalog candidates (text relaxation handles strict-match misses).
    const search = await kapruka.searchProducts({
      q: query,
      limit: CANDIDATE_LIMIT,
      deliverTo: args.deliverTo,
      deliverBy: args.deliverBy,
    });
    if ("error" in search) return { error: search.error ?? "Couldn't search the catalog." };

    const candidates = search.products.filter((p) => p.imageUrl);
    if (candidates.length === 0) {
      return {
        caption,
        query,
        verdict: "none",
        topScore: 0,
        products: [],
        deliveryContext: search.deliveryContext,
        relaxed: search.relaxed,
      };
    }

    const supa = rpcClient();
    const ids = candidates.map((p) => p.id);

    // The catalog candidates are already relevant text matches - so visual
    // RANKING is an enhancement, not a hard dependency. If anything Voyage-side
    // fails (most likely a free-tier 429: 3 RPM / 10K TPM), we fall back to
    // showing these candidates unranked rather than surfacing an error: the
    // shopper still gets a clean carousel of close finds.
    let products: VisualMatch[];
    let topScore = 0;
    let degraded = false;
    try {
      // 3) Find which candidate images we still need to embed (cache misses).
      const { data: have } = await supa.rpc("product_embeddings_have", { p_ids: ids });
      const cachedIds = new Set(
        (have ?? []).map((r: { product_id: string }) => r.product_id),
      );
      const misses = candidates.filter((p) => !cachedIds.has(p.id));

      // 4) ONE Voyage request: the shopper's photo (index 0) + every uncached
      // candidate image, embedded together so a search costs a single round-trip
      // against the 3 RPM free-tier limit. Then cache the candidate vectors.
      const batch: EmbedInput[] = [
        { image: args.imageDataUrl },
        ...misses.map((p) => ({ image: p.imageUrl as string })),
      ];
      const vecs = await embed(batch);
      const queryVec = vecs[0];
      if (!queryVec) throw new Error("empty query embedding");

      await Promise.all(
        misses.map((p, i) =>
          vecs[i + 1] // +1 skips the query photo at index 0
            ? supa.rpc("upsert_product_embedding", {
                p_product_id: p.id,
                p_embedding: toVectorLiteral(vecs[i + 1]),
                p_image_url: p.imageUrl,
              })
            : Promise.resolve(),
        ),
      );

      // 5) Rank the candidates by cosine similarity to the photo, in pgvector.
      const { data: ranked } = await supa.rpc("match_product_embeddings", {
        p_query: toVectorLiteral(queryVec),
        p_ids: ids,
        p_limit: CANDIDATE_LIMIT,
      });
      const scoreById = new Map<string, number>(
        (ranked ?? []).map((r: { product_id: string; score: number }) => [
          r.product_id,
          Number(r.score),
        ]),
      );

      // 6) Order by visual score; attach the score for the UI.
      products = candidates
        .map((p) => ({ ...p, matchScore: scoreById.get(p.id) ?? 0 }))
        .sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0));
      topScore = products[0]?.matchScore ?? 0;
    } catch (rankErr) {
      // Graceful degradation: keep the catalog candidates in their text-relevance
      // order (topScore 0 → the UI shows no match-% badge, just "similar finds").
      console.error(
        "[aura/visual-search] ranking unavailable, showing unranked candidates:",
        rankErr instanceof Error ? rankErr.message : String(rankErr),
      );
      products = candidates.map((p) => ({ ...p }));
      degraded = true;
    }

    return {
      caption,
      query,
      // Degraded (no ranking) → "loose" so the UI/model frame it as "closest
      // visual matches" rather than "none" (which would imply we found nothing).
      verdict: degraded ? "loose" : verdictFor(topScore),
      topScore,
      products,
      deliveryContext: search.deliveryContext,
      relaxed: search.relaxed,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { error: `Visual search hiccuped: ${msg.slice(0, 160)}` };
  }
}
