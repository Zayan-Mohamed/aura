# Aura — Proto-5 Implementation Report

Date: 2026-06-16
Source brief: `tmp/proto-5/requirements.claude.txt` (an evaluator's research + idea
dump, not a formal spec) cross-referenced against the live codebase.

This pass implemented the brief's own recommended priority order
(**reliability → voice → comparison → decide-helpers → reorder**), skipping
ideas that were already shipped or that the Kapruka MCP can't honestly support.
Scope was confirmed with you up front (voice = STT only + browser read-aloud;
keep the photo sign-in gate; skip data-blocked ideas).

`pnpm lint` ✅ and `pnpm build` ✅ both pass (TypeScript clean, new
`/api/transcribe` route registered, `/` still statically prerenders).

---

## 1. What was ALREADY built (brief asked for it; it existed)

The brief was written by an external tester who couldn't see the code. Several of
its "must fix / add" items already shipped — no work needed, listed so you can
demo them confidently:

| Brief item | Status in repo |
|---|---|
| Model failover when the LLM hits its limit | ✅ `app/api/chat/route.ts` — Groq primary → Groq-20b → Gemini chain, with per-instance cooldown + buffered fallthrough |
| Response streaming ("feels like it hangs") | ✅ Already streams via `createUIMessageStream`; reasoning/tool-input buffered until durable output |
| Graceful rate-limit recovery | ✅ Friendly "getting a lot of love" message + Retry |
| Live order-tracking card | ✅ `trackOrder` tool + `order-tracking.tsx` |
| Inline delivery ETA / freshness on cards | ✅ "Proactive Delivery Confidence" — per-item badges in `lib/kapruka.ts` + `product-card.tsx` |
| Sinhala / Singlish / Tanglish / Tamil | ✅ `lib/detect-language.ts` + per-turn system directive |
| Multi-item basket + checkout pay-link | ✅ `use-basket.ts`, `basket-drawer.tsx`, `checkout-card.tsx` |
| Saved chats / per-user persistence | ✅ Supabase (`lib/cloud.ts`) |

---

## 2. What was IMPLEMENTED this pass

### A. Voice input — speech-to-text (the brief's #1 "signature move")
- **`app/api/transcribe/route.ts`** — new route; forwards a recorded clip to
  Groq Whisper (`whisper-large-v3-turbo`), with size guard (~8 MB), optional
  language hint, and friendly rate-limit handling.
- **`lib/use-dictation.ts`** — push-to-talk hook (MediaRecorder → upload →
  transcript). Maps the shopper's profile language to a Whisper hint
  (Sinhala→si, Tanglish→ta, etc.).
- **`components/aura/composer.tsx`** — mic button with idle / recording (pulsing)
  / transcribing states; transcript is **appended to the input for review**,
  never auto-sent. Inline error row if the mic is blocked.
- Works in every language Whisper supports; **no extra API keys** (reuses
  `GROQ_API_KEY`).

### B. Message action bar — read-aloud + copy
- **`lib/use-speech.ts`** — read-aloud via the browser's built-in
  `SpeechSynthesis` (zero cost / keys). Picks a voice matching the reply's
  detected language (si-LK / ta-IN / en) when the OS has it.
- **`components/aura/message-actions.tsx`** — quiet action row under each
  assistant reply: **Copy**, **Read aloud** (speaker icon, toggles), wired for an
  optional Regenerate.
- Integrated in **`components/aura/message.tsx`**.

### C. Comparison card ("help me decide")
- **`compareProducts` tool** (`lib/tools.ts`) — 2–4 product IDs + an optional
  one-line `verdict`. Fetcher **`lib/kapruka.ts#compareProducts`** (parallel,
  cached, order-preserving).
- **`components/aura/comparison-card.tsx`** — side-by-side table (image, price,
  savings, stock, delivery, category) with a **"Best value"** tag on the lowest
  in-stock price (honest, from real data) and a verdict footer.
- Rendered via **`tool-part.tsx`**; compact model rendering in
  **`model-output.ts#compareResultToModel`**; system prompt teaches when to use it.

### D. Budget guardian + "Why this" rationale
- **`lib/use-budget.ts`** — optional spend ceiling (localStorage store).
- **`basket-drawer.tsx`** — "Set a budget" → running **Rs X of Rs Y** progress
  bar (jade → gold → rose), over-budget warning with a swap nudge.
- **"Why these" line** — `searchProducts` / `visualSearch` gained an optional
  `rationale` arg the model fills with one concierge sentence
  ("soft whites, under budget, reach Galle fresh"), rendered above the carousel
  (`product-carousel.tsx`). System prompt guides its use.

### E. Quick-reply chips
- **`lib/quick-replies.ts`** — derives up to 4 contextual chips purely from the
  last assistant turn's tool cards (Cheaper / Compare top picks / Only in stock /
  Will it reach me? / Track order …). **No extra model round-trips.**
- **`components/aura/quick-replies.tsx`** rendered under the latest reply in
  `aura-chat.tsx`.

### F. Share the click-to-pay link (SL is WhatsApp-first)
- **`lib/share.ts`** — native Web Share sheet with a `wa.me` fallback.
- **Checkout card** — **Share pay link** (native sheet → WhatsApp) **and Copy
  link**, so the shopper can hand the actual click-to-pay URL to whoever's
  settling the bill (no account needed). This is the share with real intent.
- The earlier plain-text basket share was removed — sharing a list of item names
  serves no purpose; the payment link is the thing worth sending.

### G. One-tap reorder from history
- **`lib/cloud.ts`** — `ordersFromMessages` now captures the **cart items** off
  the `createOrder` tool input (the output omits them); new `listOrders` fetcher.
- **`left-sidebar.tsx`** — "Recent orders" section (ref, item count, total) with
  a **Reorder** button that asks Aura to rebuild the basket and re-check-out.
- **`aura-chat.tsx`** — loads orders on sign-in / after each new order.

### H. Seasonal mode
- **`lib/seasons.ts`** — date-aware (Asia/Colombo) occasion config:
  Avurudu, Vesak, **Poson (active today, 16 Jun)**, Christmas. Null the rest of
  the year.
- **`hero.tsx`** — themed ribbon + blurb + curated seasonal opening prompts
  (computed after mount to avoid hydration mismatch).

---

## 3. Deliberately SKIPPED — and why (you chose "skip + document")

These appear in the brief but the **Kapruka MCP returns no data to back them**,
so building them would mean fabricating information (a credibility risk in front
of judges). The normalized `Product` shape has price, compare-at price, stock,
image, delivery feasibility — and **no ratings, reviews, geo, or price history**.

| Skipped idea | Blocker |
|---|---|
| Review-synthesis card ("what buyers say") | MCP exposes no reviews |
| Star ratings / trust badges on cards | MCP exposes no ratings |
| "Is this a good price?" deal-score | No price-history / market data (only per-item compare-at %) |
| Live delivery **map** + ETA pin | MCP tracking returns status steps + flags, no coordinates |

If Kapruka later exposes any of these via MCP, each is a small additive card in
the existing `tool-part.tsx` pattern.

**Also not built (out of agreed scope — they need infra, not just code):**
occasion reminders, abandoned-cart nudges, price-drop / back-in-stock alerts.
These require a **scheduler (cron / edge function) + a notification channel
(email or WhatsApp Business API)** — see §4.

---

## 4. What needs YOU (human / external action)

Nothing below blocks the build; these are runtime / ops / decision items.

### Required to use the new features
1. **Microphone permission** — voice input asks the browser for mic access at
   runtime; each user grants it once. Voice/`getUserMedia` requires **HTTPS**
   (works on `localhost` and Vercel; not on a plain-HTTP origin).
2. **Verify Groq audio quota on deploy** — `/api/transcribe` uses your existing
   `GROQ_API_KEY` but Groq's **audio** endpoint has its own rate limits. Do one
   live voice test on the deployed URL. Optional override:
   `GROQ_STT_MODEL` (default `whisper-large-v3-turbo`).
3. **Read-aloud voices are device-dependent** — browser SpeechSynthesis only
   speaks Sinhala/Tamil if the user's **OS has those voices installed**. Desktop
   Chrome/Edge usually has English; many Android devices have si-LK/ta-IN. Where
   the voice is missing it falls back to the default voice (still reads, accent
   may be off). This is inherent to the free, no-key approach you chose — nothing
   to configure, just be aware for the demo.

### Reorder feature
4. **Reorder shows orders created from now on.** It reads the `orders` table
   (already in `supabase/migrations/20260611180000_aura_init.sql`, with RLS). Old
   orders placed before this change won't have stored cart items, so they'll fall
   back to a generic "help me find it again" prompt. No migration needed.

### Decisions deferred to you (if you want to go further)
5. **Spoken replies in Sinhala/Tamil (full TTS)** — you chose STT-only for now.
   If you later want Aura to *speak back* in Sinhala/Tamil reliably (beyond
   browser voices), that needs **Google Cloud Text-to-Speech** (si-LK / ta-IN
   voices) — a new API key + per-character cost. Say the word and I'll wire it.
6. **Scheduled proactive features** (occasion reminders / abandoned-cart / price
   alerts) — pick a channel and I'll build them: a Supabase **cron edge function**
   plus either email (Resend/SendGrid) or **WhatsApp Business API** (the latter
   needs Meta business verification — non-trivial lead time before 30 Jun).
7. **Open photo search to guests?** — you chose to keep the sign-in gate (protects
   the Voyage embedding quota). The brief argued for removing it for "zero
   friction." If you change your mind, I'd add a guest rate-limit alongside it.

### Pre-demo checklist
- [ ] Live voice test (record → transcript appears) on the deployed URL.
- [ ] Read-aloud test on the device you'll demo on (confirm a usable voice).
- [ ] Add two items, set a budget below the total → confirm the over-budget bar.
- [ ] Ask Aura to "compare these 3" → confirm the comparison card + verdict.
- [ ] Place a test order while signed in → confirm it appears under "Recent
      orders" and Reorder works.
- [ ] Confirm the **Poson** seasonal ribbon shows on the landing hero today.

---

## 4b. Scheduled proactive emails (SendGrid + Supabase cron)

Built the full proactive-email system the brief called for — abandoned-cart,
occasion reminders, and order delivery follow-ups — on a Supabase Edge Function +
`pg_cron`, sending via SendGrid (free tier, 100/day cap). Templates are branded
and **emoji-free**.

**Done (deployed to your Supabase project):**
- Migration `supabase/migrations/20260616120000_aura_proactive_emails.sql` —
  `occasions` + `email_log` tables, `baskets.reminded_at` / `orders.followup_sent_at`,
  owner-only RLS, `pg_cron` + `pg_net` enabled, and `service_role`-only `due_*`
  query functions. **Applied.**
- Edge Function `supabase/functions/proactive-emails/index.ts` — 3 jobs, shared
  no-emoji HTML template, daily-cap enforcement, `x-cron-secret` auth, safe no-op
  until configured. **Deployed (ACTIVE).**
- In-app **Occasion reminders** UI (profile drawer) + Supabase CRUD
  (`occasions-section.tsx`, `cloud.ts`, types).

**Needs you — see `supabase/PROACTIVE_EMAILS.md` for exact steps:**
1. SendGrid **Single Sender Verification** (no domain needed — your earlier
   blocker; domain auth is the *other* option, skip it).
2. Set 4 Edge Function secrets (`SENDGRID_API_KEY`, `MAIL_FROM`, `MAIL_FROM_NAME`,
   `CRON_SECRET`).
3. Run one `cron.schedule(...)` SQL to start the hourly job.
4. (Verify-email) Point Supabase Auth at SendGrid SMTP, **or** disable email
   confirmation. Google sign-in already works regardless.

Until those are done the function no-ops — nothing sends by accident.

## 5. Files touched

**New**
```
app/api/transcribe/route.ts
lib/use-dictation.ts
lib/use-speech.ts
lib/use-budget.ts
lib/seasons.ts
lib/share.ts
lib/quick-replies.ts
components/aura/message-actions.tsx
components/aura/comparison-card.tsx
components/aura/quick-replies.tsx
```

**Modified**
```
app/api/chat/route.ts            (system prompt: compareProducts + rationale)
lib/tools.ts                     (compareProducts tool; rationale on search/visual)
lib/kapruka.ts                   (compareProducts fetcher)
lib/model-output.ts              (compareResultToModel)
lib/cloud.ts                     (capture order items; listOrders)
components/aura/composer.tsx     (mic / dictation)
components/aura/message.tsx      (message actions)
components/aura/product-carousel.tsx (rationale line)
components/aura/tool-part.tsx    (comparison case; pass rationale)
components/aura/basket-drawer.tsx (budget guardian; WhatsApp share)
components/aura/checkout-card.tsx (WhatsApp share)
components/aura/hero.tsx         (seasonal mode)
components/aura/left-sidebar.tsx (recent orders / reorder)
components/aura/aura-chat.tsx    (orders state, reorder, quick replies, lang→composer)
```
