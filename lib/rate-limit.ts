/**
 * Best-effort, in-memory per-IP throttle for the public AI endpoints.
 *
 * This is a per-warm-instance guard (NOT a distributed limiter): it blunts the
 * obvious abuse case - a script hammering an open endpoint and draining our
 * rate-limited upstream AI quota (Groq / Voyage) - before the request ever costs
 * a token. The authoritative limits still live upstream (Groq/Voyage/Kapruka);
 * this just keeps a single shopper from monopolising a warm instance. Serverless
 * cold starts reset the counters, which is fine for a demo-scale safeguard.
 */
type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/** Best-effort client IP from the proxy header (Vercel sets x-forwarded-for). */
export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon";
}

/**
 * Fixed-window counter. Returns `{ ok: false, retryAfter }` (seconds) once `key`
 * exceeds `limit` requests within `windowMs`, otherwise `{ ok: true }`.
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const b = buckets.get(key);

  if (!b || now >= b.resetAt) {
    // Opportunistically prune expired buckets so the map can't grow unbounded.
    if (buckets.size > 5000) {
      for (const [k, v] of buckets) if (now >= v.resetAt) buckets.delete(k);
    }
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }

  if (b.count >= limit) {
    return { ok: false, retryAfter: Math.ceil((b.resetAt - now) / 1000) };
  }

  b.count++;
  return { ok: true, retryAfter: 0 };
}
