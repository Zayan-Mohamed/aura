/**
 * Voyage AI multimodal embeddings (voyage-multimodal-3, 1024-d).
 *
 * One model embeds BOTH the shopper's uploaded photo and Kapruka product images
 * into the same vector space, so cosine similarity is meaningful across them.
 * Product images are passed as URLs - Voyage fetches them, so we never download
 * catalog images ourselves (and avoid browser CORS). The user's photo is passed
 * as a base64 data URL.
 *
 * Free tier: https://www.voyageai.com  (set VOYAGE_API_KEY)
 */
const VOYAGE_URL = "https://api.voyageai.com/v1/multimodalembeddings";
const VOYAGE_MODEL = "voyage-multimodal-3";

export const EMBED_DIM = 1024;

export type EmbedInput = { text: string } | { image: string };

// Voyage content items: a base64 photo uses image_base64 (data URL kept intact);
// a remote catalog image uses image_url (Voyage fetches it).
function toContent(i: EmbedInput) {
  if ("image" in i) {
    return i.image.startsWith("data:")
      ? { type: "image_base64", image_base64: i.image }
      : { type: "image_url", image_url: i.image };
  }
  return { type: "text", text: i.text };
}

/** Embed a batch of inputs; returns vectors in the SAME order as `inputs`. */
export async function embed(inputs: EmbedInput[]): Promise<number[][]> {
  const key = process.env.VOYAGE_API_KEY;
  if (!key) throw new Error("Missing VOYAGE_API_KEY");
  if (inputs.length === 0) return [];

  const res = await fetch(VOYAGE_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: VOYAGE_MODEL,
      // Each input is one image (or text) → one embedding. Omit input_type so the
      // photo and product images are embedded symmetrically (image↔image cosine).
      inputs: inputs.map((i) => ({ content: [toContent(i)] })),
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Voyage ${res.status}: ${detail.slice(0, 300)}`);
  }

  const json = (await res.json()) as {
    data?: { index: number; embedding: number[] }[];
  };
  const out: number[][] = new Array(inputs.length);
  for (const d of json.data ?? []) out[d.index] = d.embedding;
  return out;
}

export const embedImage = (urlOrDataUrl: string) =>
  embed([{ image: urlOrDataUrl }]).then((v) => v[0]);

export const embedText = (text: string) => embed([{ text }]).then((v) => v[0]);

/** pgvector text literal for a JS number[] (what our SECURITY DEFINER RPCs expect). */
export const toVectorLiteral = (v: number[]) => `[${v.join(",")}]`;
