import type { NextConfig } from "next";

/**
 * Content-Security-Policy.
 *
 * The goal is "resources only from our own origin", but three of Aura's real
 * features force documented, minimal relaxations:
 *   - Product imagery streams from *arbitrary* external Kapruka CDN hosts
 *     (see components/aura/product-image.tsx), so img-src must allow https:.
 *   - Next.js App Router injects inline bootstrap/hydration scripts and inline
 *     styles (Tailwind v4 + framer-motion). Without a per-request nonce (which
 *     headers() can't provide — that needs middleware) script/style-src need
 *     'unsafe-inline'. 'unsafe-eval' keeps `pnpm dev`/HMR working.
 *   - Vercel Analytics loads va.vercel-scripts.com and beacons to
 *     vitals.vercel-insights.com.
 * Everything else (Groq, Kapruka MCP, Voyage) is called server-side from the
 * API routes, so connect-src only needs 'self' for those.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  "object-src 'none'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "media-src 'self' blob:",
  "worker-src 'self' blob:",
  // Supabase auth/postgrest/storage (https) + realtime (wss) run in the browser.
  "connect-src 'self' https://va.vercel-scripts.com https://vitals.vercel-insights.com https://*.supabase.co wss://*.supabase.co",
  "manifest-src 'self'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  {
    key: "Permissions-Policy",
    value: "camera=(), geolocation=(), microphone=(self), browsing-topics=()",
  },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
