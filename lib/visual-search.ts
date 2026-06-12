/**
 * Proactive Visual Search pipeline.
 *
 *   shopper photo
 *     → Groq Llama-4 Scout (vision) captions it → broad catalog query
 *     → Kapruka search (query-relaxation built in) → candidate products
 *     → Voyage multimodal-3 embeds the photo + candidate images (one shared space)
 *     → pgvector ranks candidates by cosine similarity
 *     → threshold verdict ("exact match" vs "closest visual matches")
 *
 * The chat model never sees the image — it just calls the visualSearch tool and
 * narrates the ranked cards the interface renders. Server-only (imported solely
 * by lib/tools.ts).
 */
import { z } from "zod";
import { generateObject } from "ai";
import { createGroq } from "@ai-sdk/groq";
import * as kapruka from "./kapruka";
import type { Product, DeliveryContext } from "./kapruka";
import { embed, toVectorLiteral } from "./embeddings";
import { rpcClient } from "./supabase/rpc-client";

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });
// Llama-4 Scout is multimodal on Groq — same provider captions the image.
const VISION_MODEL =
  process.env.GROQ_VISION_MODEL ?? "meta-llama/llama-4-scout-17b-16e-instruct";

// Cosine bands, calibrated for Voyage multimodal-3 (2026-06-12). Its image↔image
// cosines run much LOWER than CLIP: same-category (cake photo vs catalog cakes)
// clustered ~0.35–0.44, so "similar" sits at 0.30 and "exact" well above the
// same-category ceiling (only a genuine near-identical hit qualifies).
const EXACT_THRESHOLD = 0.65;
const SIMILAR_THRESHOLD = 0.3;

// Free-tier Voyage (no payment method) is throttled to 3 RPM / 10K tokens-per-min,
// and image embeddings are pixel-costly — a big candidate batch blows the TPM cap.
// Keep the pool small enough that one search (query + candidates) fits the limit.
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
      "A BROAD 1-2 word catalog search term — the head noun only, e.g. 'cake', 'saree', 'headphones', 'watch'. No adjectives.",
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
      model: groq(VISION_MODEL),
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
    // Caption failed — fall back to the hint or a safe generic noun.
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

    // 3) Embed only cache misses (product images) and store them.
    const { data: have } = await supa.rpc("product_embeddings_have", { p_ids: ids });
    const cachedIds = new Set(
      (have ?? []).map((r: { product_id: string }) => r.product_id),
    );
    const misses = candidates.filter((p) => !cachedIds.has(p.id));
    if (misses.length) {
      const vecs = await embed(misses.map((p) => ({ image: p.imageUrl as string })));
      await Promise.all(
        misses.map((p, i) =>
          vecs[i]
            ? supa.rpc("upsert_product_embedding", {
                p_product_id: p.id,
                p_embedding: toVectorLiteral(vecs[i]),
                p_image_url: p.imageUrl,
              })
            : Promise.resolve(),
        ),
      );
    }

    // 4) Embed the shopper's photo, then rank candidates by cosine in pgvector.
    const queryVec = (await embed([{ image: args.imageDataUrl }]))[0];
    if (!queryVec) return { error: "Couldn't read that image — mind trying another?" };

    const { data: ranked } = await supa.rpc("match_product_embeddings", {
      p_query: toVectorLiteral(queryVec),
      p_ids: ids,
      p_limit: 12,
    });
    const scoreById = new Map<string, number>(
      (ranked ?? []).map((r: { product_id: string; score: number }) => [
        r.product_id,
        Number(r.score),
      ]),
    );

    // 5) Order by visual score; attach the score for the UI.
    const products: VisualMatch[] = candidates
      .map((p) => ({ ...p, matchScore: scoreById.get(p.id) ?? 0 }))
      .sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0));

    const topScore = products[0]?.matchScore ?? 0;

    return {
      caption,
      query,
      verdict: verdictFor(topScore),
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
