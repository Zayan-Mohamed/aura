"use client";

/**
 * Downscale + JPEG-encode a picked image File into a compact data URL.
 * Phone photos are multi-MB; CLIP embeddings only need ~512px, so we shrink
 * client-side before sending — keeping the request body small and fast.
 */
export async function fileToDataUrl(
  file: File,
  maxEdge = 512,
  quality = 0.82,
): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close?.();
    throw new Error("Canvas not supported");
  }
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  return canvas.toDataURL("image/jpeg", quality);
}
