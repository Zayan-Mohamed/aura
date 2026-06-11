/**
 * Aura brand mark as a self-contained SVG string — a warm radiant bloom on a
 * gold→terracotta tile. Shared by the static favicon, the apple-touch icon, and
 * the social (OG/Twitter) image so the brand stays consistent everywhere.
 *
 * Colours are fixed hex (not theme tokens): icons render outside the app's CSS,
 * so they can't read `--gold` etc.
 */
export const BRAND = {
  goldA: "#E2A24E", // tile gradient — warm gold
  goldB: "#BE5B3A", // tile gradient — terracotta
  cream: "#FCF6EC", // the bloom
  ink: "#2C2620", // warm near-black text
  bg: "#FBF8F2", // warm paper background
  bgDark: "#221A13",
} as const;

type BloomOpts = {
  /** Rendered pixel size (the artwork is a 32-unit viewBox, scaled crisply). */
  size?: number;
  /** Rounded-square tile (browser favicon) vs full-bleed square (iOS masks it). */
  rounded?: boolean;
  /** Draw the gold tile behind the bloom. */
  tile?: boolean;
};

/** Returns the Aura bloom as an SVG markup string. */
export function auraBloomSvg({ size = 32, rounded = true, tile = true }: BloomOpts = {}): string {
  const c = 16;
  const rays = Array.from({ length: 8 }, (_, i) => {
    const a = (i * Math.PI) / 4;
    const x1 = (c + Math.cos(a) * 8.4).toFixed(2);
    const y1 = (c + Math.sin(a) * 8.4).toFixed(2);
    const x2 = (c + Math.cos(a) * 12.3).toFixed(2);
    const y2 = (c + Math.sin(a) * 12.3).toFixed(2);
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
  }).join("");

  const tileRect = tile
    ? `<rect width="32" height="32" rx="${rounded ? 7.5 : 0}" fill="url(#auraTile)"/>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="${size}" height="${size}">\
<defs><linearGradient id="auraTile" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">\
<stop offset="0" stop-color="${BRAND.goldA}"/><stop offset="1" stop-color="${BRAND.goldB}"/>\
</linearGradient></defs>\
${tileRect}\
<g stroke="${BRAND.cream}" stroke-width="2.5" stroke-linecap="round">${rays}</g>\
<circle cx="16" cy="16" r="5.1" fill="${BRAND.cream}"/>\
</svg>`;
}

/** Base64 data URL for embedding the bloom as an <img> inside next/og ImageResponse. */
export function auraBloomDataUrl(opts?: BloomOpts): string {
  const svg = auraBloomSvg(opts);
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}
