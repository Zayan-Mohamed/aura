/**
 * Feature flags.
 *
 * Visual search runs on Voyage's rate-limited free tier, so it ships behind a
 * switch. It's ON by default; set `NEXT_PUBLIC_VISUAL_SEARCH=false` to hide the
 * photo-upload button (client) AND make the chat route ignore image turns
 * (server) — a real kill-switch for demo/quota windows, not just a UI hide.
 *
 * NEXT_PUBLIC_ so the SAME value gates both the browser and the route. Note that
 * NEXT_PUBLIC_ vars are inlined at build time, so flipping it on Vercel needs a
 * redeploy (locally, restart the dev server).
 */
export const visualSearchEnabled = process.env.NEXT_PUBLIC_VISUAL_SEARCH !== "false";
