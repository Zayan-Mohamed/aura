# Aura — Features & Capabilities

Aura is an AI shopping concierge for Kapruka. Instead of a text-heavy chatbot, it streams an interactive, full-screen visual experience — product cards, carousels, delivery checks and secure pay links — over Kapruka's live catalogue, and it talks the way Sri Lankans actually type.

This document is a tour of what Aura can do and the design principles behind it. For setup, stack and architecture, see the [README](./README.md).

---

## Core experience

- **Generative, visual-first UI.** Every search, comparison, delivery check and checkout is rendered as a rich interactive component, never a wall of text. The assistant frames results in a sentence and lets the cards do the showing.
- **Proactive Delivery Confidence.** A Sri Lankan shopper's biggest fear is the order that arrives late — or not at all. Aura establishes *where* and *when* early, checks each product against real delivery feasibility, stamps deliverable items with a freshness/ETA badge, and quietly hides what can't make it in time.
- **Speaks the shopper's language.** English, Sinhala, Tamil, Singlish (Romanized Sinhala) and Tanglish (Romanized Tamil) are detected per message and mirrored faithfully, with a saved profile language that always wins. Product cards do the visual work in every language; only the framing sentence changes.
- **A concierge, not a search box.** Warm, witty, with a sense of occasion — it reads the situation, has an opinion, and leads to the natural next step.

---

## What Aura can do

### Search & discovery
- **Conversational product search** across Kapruka's catalogue, with smart query relaxation — an over-specific phrase that returns nothing falls back to the closest matches, and Aura says so honestly rather than implying a perfect hit.
- **"Why these" rationale.** When the picks reflect a real choice (budget, occasion, who it's for, what arrives fresh), a single concierge sentence appears above the carousel explaining the reasoning.

### Visual search
- Upload a photo as inspiration and Aura finds the closest real products: the image is captioned, the photo and candidate catalogue images are embedded into one shared space, and results are ranked by visual similarity with an honest verdict (exact / similar / closest matches).

### Help me decide
- **Side-by-side comparison cards** for 2–4 products — price, savings, stock, delivery and category in one clear table, with a "Best value" tag drawn from real data and a one-line verdict recommending one and why.
- **Budget guardian.** Set an optional spend ceiling and the basket shows a running progress bar with a gentle over-budget nudge.
- **Quick-reply chips.** Up to four contextual follow-ups (Cheaper · Compare top picks · Only in stock · Will it reach me? · Track order …) derived from the last reply — no extra round-trips.

### Voice & accessibility
- **Voice input.** Push-to-talk dictation transcribes the shopper's speech in their language and appends it to the input for review — never auto-sent.
- **Read-aloud & copy.** A quiet action row under each reply reads the message aloud in a voice matching the detected language (where the device has one) and copies the text.

### Basket, checkout & sharing
- **Multi-item basket → one checkout.** Collect several products, then check out together as a single secure click-to-pay link with a live countdown.
- **Gift touches.** Optional gift messages, and icing text for cakes.
- **Share the pay link.** Hand the actual click-to-pay link to whoever's settling the bill via the native share sheet or WhatsApp (Sri Lanka is WhatsApp-first) — no account needed on their side.

### After the sale
- **Live order tracking** rendered as a status card.
- **One-tap reorder** from order history — Aura rebuilds the basket and re-checks-out without a fresh conversation.
- **Your usuals.** The home screen surfaces de-duplicated products from past orders for one-tap re-add.

### Membership & continuity
- **Aura Prestige tiers.** Verified, paid orders unlock genuine concierge perks. Perks are real Aura-layer behaviours — Aura never invents Kapruka discounts, fee waivers, or special inventory it can't actually provide.
- **Saved chats & profiles.** Signed-in shoppers get persisted conversations, orders, basket and preferences, scoped to them.
- **Proactive reminders (opt-in).** Occasion reminders, abandoned-basket nudges and post-delivery follow-ups can be sent by email on a schedule, with branded templates and a daily cap.

### First-run guidance
- A short guided tour walks first-time visitors through the key surfaces (basket, profile, tiers, composer) and can be re-launched any time.

---

## Built on real data only

Aura shows what Kapruka actually exposes, and nothing it would have to fabricate. The catalogue gives price, compare-at price, stock, image and delivery feasibility — but **no ratings, reviews, geolocation or price history.** Rather than invent those to look richer, Aura deliberately leaves them out:

| Not shown | Why |
|---|---|
| Review-synthesis ("what buyers say") | The catalogue exposes no reviews |
| Star ratings / trust badges | The catalogue exposes no ratings |
| "Is this a good price?" deal scores | No price-history or market data (only per-item compare-at %) |
| Live delivery map / ETA pin | Tracking returns status steps and flags, not coordinates |

If Kapruka exposes any of these in future, each slots in as a small additive card in the existing rendering pattern.

---

## Reliability by design

Because Aura runs on rate-limited service tiers, graceful degradation is a first-class feature, not an afterthought:

- **Transparent model failover** keeps a turn alive when one model hits its limit, falling through a chain of independent providers without the shopper noticing a seam.
- **A warm, honest rate-limit experience** — if everything is briefly exhausted, Aura says so kindly and offers Retry, reassuring the shopper that their basket and chat are safe. This message is shown *only* on genuine limit conditions; other hiccups get their own distinct, non-alarming message.
- **The catalogue layer never hard-fails.** Every data fetch resolves to results or a friendly notice, so a slow or busy upstream degrades into a graceful message rather than a broken screen.

See the README's *Resilience* section for the technical detail.
