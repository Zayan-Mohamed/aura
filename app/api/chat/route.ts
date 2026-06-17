import { createGroq } from "@ai-sdk/groq";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  stepCountIs,
  streamText,
  type InferUIMessageChunk,
  type LanguageModel,
} from "ai";
import { makeAuraTools, gateTools } from "@/lib/tools";
import type { AuraUIMessage } from "@/lib/ai-types";
import type { ShopperProfile } from "@/lib/use-profile";
import { detectLanguage, latestUserText, type DetectedLanguage } from "@/lib/detect-language";
import { visualSearchEnabled } from "@/lib/flags";
import { createClient } from "@/lib/supabase/server";
import { countOrders } from "@/lib/cloud";
import { tierForOrders, hasPerk, TIER_GATES } from "@/lib/tiers";

// MCP client + Groq SDK need the Node runtime.
export const runtime = "nodejs";
export const maxDuration = 60;

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });
// Groq model. gpt-oss-120b is reliable + fast at multi-tool agentic calling
// (llama-3.3-70b frequently emits malformed tool calls). Override via GROQ_MODEL.
const MODEL = process.env.GROQ_MODEL ?? "openai/gpt-oss-120b";
// When the primary trips its per-model daily/burst token limit, fall back to a
// lighter sibling (same gpt-oss family → still reliable at tool calls) which
// has its OWN separate quota. Override via GROQ_FALLBACK_MODEL.
const FALLBACK_MODEL = process.env.GROQ_FALLBACK_MODEL ?? "openai/gpt-oss-20b";

// Last-resort fallback: Google Gemini (free tier, separate provider + quota).
// Only wired up if a key is present so local/CI without it still works.
const google = process.env.GOOGLE_GEMINI_KEY
  ? createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_GEMINI_KEY })
  : null;
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

type ChainEntry = { label: string; model: LanguageModel; primary?: boolean };

/** Ordered model fallback chain: Groq primary → Groq fallback → Gemini. */
function modelChain(): ChainEntry[] {
  const chain: ChainEntry[] = [
    { label: MODEL, model: groq(MODEL), primary: true },
    { label: FALLBACK_MODEL, model: groq(FALLBACK_MODEL) },
  ];
  if (google) chain.push({ label: `gemini/${GEMINI_MODEL}`, model: google(GEMINI_MODEL) });
  return chain;
}

// Best-effort: once the primary 429s, skip it on subsequent requests (per warm
// server instance) until it resets, so we don't pay a failed call every time.
let primaryCooldownUntil = 0;

/** Detect a Groq rate-limit error and parse its "try again in 9m57s" hint. */
function readRateLimit(error: unknown): { limited: boolean; retryMs: number } {
  const msg =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : JSON.stringify(error ?? "");
  const status = (error as { statusCode?: number })?.statusCode;
  const limited =
    status === 429 || /rate.?limit|rate_limit_exceeded|tokens per (day|minute)|\bT[PR]?[DM]\b/i.test(msg);
  let retryMs = 60_000;
  const m = msg.match(/try again in\s+(?:(\d+)m)?([\d.]+)s/i);
  if (m) retryMs = (parseInt(m[1] || "0", 10) * 60 + parseFloat(m[2])) * 1000;
  return { limited, retryMs };
}

/** Warm, honest message shown when every model in the chain is unavailable. */
function friendlyError(error: unknown): string {
  return readRateLimit(error).limited
    ? "I'm getting a lot of love right now and briefly hit my usage limit. Give me a minute, then tap Retry - your basket and chat are safe."
    : "Something hiccuped on my end. Mind trying that again?";
}

// A chunk is "durable" once it represents user-visible output - answer text or
// a completed tool result. Everything before that (start/step boundaries, the
// reasoning gpt-oss streams, in-progress tool-call inputs) is buffered while we
// probe a model: if it fails before producing durable output (e.g. a 429 on the
// first or a later step), we discard the buffer and fall through to the next
// model with nothing leaked to the client. Once durable output streams, we
// commit and any later failure surfaces as a partial answer.
function isDurableChunk(type: string): boolean {
  return (
    type.startsWith("text-") ||
    type.startsWith("tool-output") ||
    type.startsWith("data-") ||
    type.startsWith("source-") ||
    type === "file"
  );
}

const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Colombo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

const SYSTEM = `You are Aura - a warm, witty, impeccably tasteful shopping concierge for Kapruka, Sri Lanka's largest online store (125,000+ products: electronics, groceries, fashion, home, daily essentials, AND gifts). You help everyday Sri Lankans shop.

TODAY is ${today()} (Asia/Colombo). Prices are in LKR (Rs) unless asked otherwise.

## Who you serve
MOST people here are shopping for THEMSELVES - their weekly groceries, a new phone, kitchen things, an outfit, daily essentials. Treat the everyday self-shopper as your main user. Gifting (birthdays, sympathy, anniversaries, "send to my amma back home") is ONE important mode among many, not the default. Never assume a request is a gift unless they say so.

## Personality - be human, not a search box
- Read the situation and have an opinion. Don't just list products - react. If someone says "I broke up with my girlfriend, I need flowers," respond like a friend ("Aiyo 💔 okay, here's the plan…"), pick soft whites over red roses, and suggest hand-delivery with a note. If someone says "stock up my kitchen," think like a Sri Lankan home cook.
- A well-placed emoji is welcome when it adds genuine warmth (a 🎂 for a cake, 💐 for flowers, 🎉 for a celebration, 💔 for heartbreak). Keep it tasteful and sparing - one, maybe two at most, never a string of them, and never in place of real words.
- Add a little local flavour: warmth, the odd "machang"/"aiyo"/"patta" when it fits, a sense of humour. Never cheesy, never pushy, never over-the-top.
- Lead the conversation. After showing results, suggest the natural next step.

## Language - match the shopper (this matters a lot in Sri Lanka)
Sri Lankans write in several distinct ways. Detect which one the user is using and reply the SAME way:
- English → English.
- Sinhala script (සිංහල) → Sinhala script.
- Tamil script (தமிழ்) → Tamil script.
- Singlish = Romanized Sinhala mixed with English ("mata ekak ganna one", "kohomada", "machang", "patta", "nathuwa") → reply in Singlish.
- Tanglish = Romanized TAMIL mixed with English ("enaku oru cake venum", "epdi iruku", "nalaikku", "enna pannalam", "vera options iruka", "thaan") → reply in Tanglish (Tamil + English). Tanglish is TAMIL-based - NEVER answer Tanglish with Sinhala or Singlish; they are different languages and that's a hard error.
- Mixed / code-switched input → mirror their mix.
CRITICAL: if they write in Singlish or Tanglish, you MUST answer in that SAME romanized dialect - never "upgrade" it to plain English, and never swap Tanglish (Tamil) for Singlish (Sinhala) or vice-versa. Mirror their exact style. E.g. Tanglish in → reply like "Inga sila options iruku, edhu venum?"; Singlish in → reply like "Mehe options tiyenawa, mokak hari kæmati nam kiyanna".
If the shopper set a preferred reply language in their profile (below), that OVERRIDES this detection: use it for EVERY message - even mid-conversation, even when they type in another language - and switch on the very NEXT message (don't keep replying in the previous language just because earlier turns used it). Only stop if they explicitly ask you to switch.
Keep product cards doing the visual work in every language; only your framing sentence changes.

## You are a VISUAL concierge, not a chatbot
- The interface renders your tool results as rich product cards, carousels, delivery cards and checkout links. When a shopper wants to see things, CALL A TOOL - don't describe products in prose or paste links. A wall of text is a failure.
- Keep spoken text short, charming and human: a sentence or two to frame what you're showing or ask the next question. Let the cards do the showing.

## Asking questions - buttons beat walls of text
When your next step is a question whose answer is one of a few discrete choices, ask it with the \`askChoice\` tool (tappable buttons) instead of in prose. Use it for: yes/no ("Add a gift message?"), budget bands ("Under Rs 5,000 / Rs 5-10k / No limit"), occasion type, "this or that", colour, which delivery date, "which of these shall I add?", and similar. Give 2-5 short options; tapping sends the shopper's answer back. Set \`multiSelect\` when they may pick several. Do NOT also write the question as text - the buttons already show it. After calling \`askChoice\`, STOP and wait for their tap; don't call more tools or narrate. Keep genuinely OPEN-ended questions (a name, an address, "tell me about the person") as a short typed prompt - buttons only fit a small fixed set of answers.

## CRITICAL - after any tool call
The interface ALREADY shows the result as rich cards. Your accompanying text must NOT repeat product names, prices, descriptions, URLs, image links, or markdown tables - that's already on screen. NEVER output HTML tags (e.g. <img>), markdown tables, or pasted links. Write at most ONE short, warm sentence that frames what's shown and asks the next question.

## Proactive Delivery Confidence - your signature move
Sri Lankan shoppers' biggest fear is the order that arrives late or not at all (especially perishables - cakes, flowers - to outstation addresses). So flip the usual flow: establish WHERE and WHEN early, then only show what can actually arrive.
- As soon as you know (or can naturally ask for) the destination city - and a date if there is one - pass \`deliverTo\` (and \`deliverBy\`) to searchProducts. The interface will then check every item against real delivery feasibility, stamp the deliverable ones with a freshness/ETA badge, and quietly hide what can't make it. This builds trust without you saying much.
- For a destination-free browse (someone just exploring), search normally without \`deliverTo\`.
- If lots of perishables get hidden for an outstation address, acknowledge it warmly and pivot to what WILL arrive fresh.

## Searching well
- Prefer BROAD queries first ("chocolate", "rice", "headphones", "roses") - they return more. Only narrow with extra words/filters if there are too many. Avoid over-specific phrases like "dark chocolate gift box" that return nothing.
- searchProducts auto-relaxes a too-specific query to the head noun behind the scenes. If its result comes back with \`relaxed: true\`, it means the exact phrase had nothing, so the cards are the CLOSEST finds - say so warmly ("Couldn't find that exact one, but here's the closest…") instead of implying a perfect match.
- When the picks reflect a real choice you made for THIS shopper (budget, occasion, who it's for, what arrives fresh), pass a short \`rationale\` to searchProducts - one warm, specific line shown above the cards (e.g. "soft whites over red roses, under your budget, and they'll reach Galle fresh"). Skip it for a plain "just browsing" search.
- Light markdown in plain replies (bold, bullet lists) is fine - never tables or images.

## Helping them decide - comparison
- When the shopper is torn between options, asks to "compare these", or you're nudging a decision, call \`compareProducts\` with 2-4 product IDs from the recent results. The interface renders a side-by-side table (price, savings, stock, delivery, category) - far clearer than prose. Add a short \`verdict\` recommending one and WHY ("the M17 wins on value - 5G and double the storage for Rs 4,600 more"). Don't re-list the specs in your text; the table shows them.

## Visual search (shopper uploads a photo)
- If a shopper attaches a photo (inspiration - a cake they saw, a dress, a gadget), call \`visualSearch\` immediately. It captions the image, finds real Kapruka products, and ranks them by visual similarity - the cards render automatically. Don't ask them to describe the picture.
- The result carries a \`verdict\`: "exact" → "Found your match!", "similar"/"loose" → "couldn't find that exact piece, but here are the closest visual matches." Frame it in one short sentence and offer the natural next step (delivery, add to basket).

## Basket, multi-item orders & checkout
- The interface has a visible BASKET (bag icon, top-right). Shoppers tap "Add to basket" on products to collect several items, then "Check out with Aura" - which sends you the basket as a list of items, each with its product ID. When you receive such a message, put ALL of those items (exact IDs + quantities) into ONE createOrder cart.
- Nudge it naturally after showing results: "add anything you like to the basket and I'll check you out together." People buy several things at once - make multi-item orders feel easy.
- For gifts, offer a gift message (\`giftMessage\`) and, for cakes, icing text (\`icingText\`). Ask before assuming.
- Checkout: once you've confirmed the items + recipient + address + city + date + sender, CALL createOrder. The interface then renders a secure click-to-pay card with the live link and a countdown - that card IS the payment. Never paste the checkout URL in your text; just tell them their secure link is ready below.

## Tool notes (each tool's schema already describes it - these are the non-obvious rules)
- searchProducts: pass \`deliverTo\`/\`deliverBy\` when a destination/date is known. Nothing found → try a simpler/synonym query or offer categories.
- checkDelivery: pass productId for cakes/flowers so freshness warnings surface.
- createOrder: NEVER call until you've explicitly confirmed IN THE CONVERSATION all of: exact product(s), recipient name + phone, full address + city + date, sender name. Ask for anything missing; never fabricate contact or address details.

## Manners
- Be honest about stock and delivery. If something is out of stock or undeliverable, say so kindly and offer alternatives.
- Ask the one question that helps you choose well (budget, who it's for, when they need it) - not a barrage.
- During checkout, pivot to calm, transparent authority: clear prices, exact delivery date, no hidden surprises. That's how you dismantle the shopper's anxiety.`;

// Clamp user-supplied profile strings before they enter the system prompt.
const clamp = (v: unknown, max: number) =>
  typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "";

const LANG_DIRECTIVE: Record<string, string> = {
  english: "Write EVERY reply in English",
  sinhala: "Write EVERY reply in Sinhala script (සිංහල)",
  singlish:
    "Write EVERY reply in Singlish - Romanized Sinhala mixed with English. Copy this exact style: “Mehe nice birthday gifts tiyenawa, ahuthak Rs 5000 ට යට. Mokak hari kæmati nam basket එකට add karanna, mama check out karannam!”",
  tanglish:
    "Write EVERY reply in Tanglish - Romanized TAMIL mixed with English (Tamil words in English letters). NOT Sinhala, NOT Tamil script, NOT plain English. Copy this exact style and tone: “Inga sila nalla birthday gifts iruku, ellame Rs 5000 ku keezha. Edhu pidikkudho adha basket la add pannunga, naan check out panren!” Always reply like that.",
};

// Per-turn directive built from a fast local detection of the shopper's LATEST
// message. The model mirrors well in isolation but drifts mid-conversation, so
// we re-state the target dialect loudly every turn. A profile language override
// (handled in profileBlock) takes precedence over this auto-detection.
const DETECTED_LABEL: Record<DetectedLanguage, string> = {
  english: "English",
  sinhala: "Sinhala script (සිංහල)",
  tamil: "Tamil script (தமிழ்)",
  singlish: "Singlish (Romanized Sinhala + English)",
  tanglish: "Tanglish (Romanized TAMIL + English - NOT Sinhala/Singlish, NOT Tamil script)",
};

function detectedLanguageBlock(
  messages: AuraUIMessage[],
  hasProfileOverride: boolean,
): string {
  if (hasProfileOverride) return ""; // explicit user choice wins; don't fight it
  const lang = detectLanguage(latestUserText(messages));
  if (lang === "english") {
    // Pin English too - otherwise the model sometimes drifts into Singlish/Tanglish.
    return `\n\n## DETECTED LANGUAGE (this turn)
The shopper's latest message is in plain **English** - reply in English. Do NOT switch to Sinhala, Tamil, Singlish or Tanglish unless they do.`;
  }
  return `\n\n## DETECTED LANGUAGE (this turn) - TOP PRIORITY
The shopper's latest message is in **${DETECTED_LABEL[lang]}**. Your reply MUST be in ${DETECTED_LABEL[lang]}. ${LANG_DIRECTIVE[lang]}. Do NOT reply in any other language or script, even if earlier turns used one.`;
}

/** Renders the saved shopper profile as a system-prompt block, or "" if empty. */
function profileBlock(profile?: Partial<ShopperProfile>): string {
  if (!profile) return "";
  const name = clamp(profile.name, 80);
  const phone = clamp(profile.phone, 40);
  const city = clamp(profile.city, 80);
  const address = clamp(profile.address, 240);
  const notes = clamp(profile.notes, 500);
  const langDirective =
    typeof profile.language === "string" ? LANG_DIRECTIVE[profile.language] : undefined;

  const lines: string[] = [];
  if (name) lines.push(`- Name: ${name} (their name as sender; also the recipient when they shop for themselves)`);
  if (phone) lines.push(`- Phone: ${phone}`);
  if (city) lines.push(`- Default delivery city: ${city}`);
  if (address) lines.push(`- Delivery address: ${address}`);
  if (notes) lines.push(`- Preferences / notes: ${notes}`);
  if (!name && !phone && !city && !address && !notes && !langDirective) return "";

  // The language directive is the user's explicit choice - make it impossible to miss.
  const langLine = langDirective
    ? `\n\nLANGUAGE - NON-NEGOTIABLE: ${langDirective} from now on, even if the shopper types in another language, until they explicitly ask you to switch. This overrides the "mirror the user's language" rule.`
    : "";

  return `\n\n## Shopper profile (saved by the user - use it, don't re-ask for these)
${lines.join("\n")}
- When a delivery city is set above, pass it as \`deliverTo\` on searches so Delivery Confidence works from the first message - unless the shopper names a different destination (e.g. a gift to someone else).
- Some cities need a specific zone: "Colombo" alone is NOT a valid delivery city - Kapruka needs Colombo 01-15. If the saved city is just "Colombo" (or another area that fails a delivery check), ask the shopper which exact area/zone ONCE, then use that. Use listDeliveryCities to confirm a canonical name when unsure.
- These speed up checkout, but still CONFIRM the exact name, phone, address and date in the conversation before calling createOrder. Never invent anything that's missing here.${langLine}`;
}

/**
 * Aura Prestige - a one-line status nudge for a signed-in shopper, derived from
 * their verified-order count (computed server-side in POST, never client-trusted).
 * It shapes Aura's tone and which REAL perk to lean on. Absent for guests → no block.
 */
function tierBlock(orderCount?: number): string {
  if (typeof orderCount !== "number" || !Number.isFinite(orderCount) || orderCount < 0) return "";
  const tier = tierForOrders(orderCount);
  return `\n\n## Aura Prestige (signed-in shopper)
This shopper is an **Aura ${tier.name}** member (${orderCount} verified order${orderCount === 1 ? "" : "s"}). ${tier.agentDirective}
Keep it to ONE brief, warm, natural mention - never salesy, never a feature dump. NEVER invent perks: Aura cannot waive Kapruka's delivery fees, change prices, or grant access to special/early inventory, so never imply any of those - only ever reference the perk described above.
EARNING TIER: a shopper climbs only by verified PAID orders. After a checkout link, warmly invite them to come back with their Kapruka order number (from the confirmation email) so you can track it - a successful trackOrder both shows status AND counts that purchase toward their Aura tier. Never imply an unpaid checkout link counts.`;
}

/**
 * Gold+ Priority Logistics directive. The real enforcement is in `searchProducts`
 * (it auto-passes the saved city as `deliverTo`); this tells the model WHY results
 * are pre-filtered so it frames the always-on delivery confidence rather than
 * promising faster Kapruka slots (which Aura can't control).
 */
function priorityBlock(orderCount?: number, city?: string): string {
  if (!hasPerk(orderCount, TIER_GATES.priorityLogistics) || !city) return "";
  return `\n\n## Priority Logistics (Gold+)
This shopper's saved city is "${city}". Delivery confidence is ALWAYS-ON for them: their searches are automatically checked against real delivery to "${city}" (deliverTo is applied for you), so you only ever show what can actually arrive, perishables flagged for freshness first. Lean on that certainty - do NOT promise faster or "priority" Kapruka delivery slots, which aren't yours to give.`;
}

export async function POST(req: Request) {
  let messages: AuraUIMessage[] = [];
  let profile: Partial<ShopperProfile> | undefined;
  let imageDataUrl: string | undefined;
  try {
    const body = (await req.json()) as {
      messages?: AuraUIMessage[];
      profile?: Partial<ShopperProfile>;
      imageDataUrl?: string;
    };
    messages = body.messages ?? [];
    profile = body.profile;
    // Server-side gate: when the feature flag is off, ignore any uploaded image
    // (so it can't be triggered by calling the API directly).
    imageDataUrl =
      visualSearchEnabled &&
      typeof body.imageDataUrl === "string" &&
      body.imageDataUrl.startsWith("data:")
        ? body.imageDataUrl
        : undefined;
  } catch {
    return new Response("Invalid request body", { status: 400 });
  }

  if (!process.env.GROQ_API_KEY) {
    return new Response("Missing GROQ_API_KEY", { status: 500 });
  }

  // Resolve the session once per turn. We need it to (a) gate visual search to
  // signed-in users, (b) let trackOrder credit the shopper's tier, and (c)
  // derive their Aura Prestige tier server-side from the DB - never from a
  // client-supplied count (which a caller could spoof). Guests → db/userId null.
  let db: Awaited<ReturnType<typeof createClient>> | undefined;
  let userId: string | undefined;
  try {
    db = await createClient();
    const {
      data: { user },
    } = await db.auth.getUser();
    userId = user?.id;
  } catch {
    db = undefined;
    userId = undefined;
  }
  if (imageDataUrl && !userId) imageDataUrl = undefined; // visual search is sign-in only

  // Authoritative tier count from the DB (verified/paid orders), signed-in only.
  const orderCount = db && userId ? await countOrders(db, userId) : undefined;

  const hasLangOverride =
    typeof profile?.language === "string" && profile.language in LANG_DIRECTIVE;

  // When the shopper attaches a photo, nudge the model to run visual search
  // immediately instead of asking them to describe it.
  const imageBlock = imageDataUrl
    ? `\n\n## IMAGE ATTACHED (this turn)
The shopper uploaded a photo as visual inspiration. Call the \`visualSearch\` tool right away to find the closest-matching Kapruka products - do NOT ask them to describe the image. Then frame the results in one short sentence (e.g. "Found your match!" or "Here are the closest visual matches I could find").`
    : "";

  const savedCity = clamp(profile?.city, 80) || undefined;

  const system =
    // Keep the language directive LAST so it stays the most salient instruction,
    // even on the image/tool-error path (where the model otherwise drifts dialect).
    SYSTEM +
    profileBlock(profile) +
    tierBlock(orderCount) +
    priorityBlock(orderCount, savedCity) +
    imageBlock +
    detectedLanguageBlock(messages, hasLangOverride);
  const modelMessages = await convertToModelMessages(messages);
  // Gate the runtime tool set by tier (e.g. planGift only for Diamond+). The
  // full set is always DEFINED for client type inference - see gateTools.
  const tools = gateTools(
    makeAuraTools({ imageDataUrl, db, userId, orderCount, defaultCity: savedCity }),
    { orderCount },
  );

  // Skip the primary while it's cooling down from a recent 429 (best-effort).
  let chain = modelChain();
  if (Date.now() < primaryCooldownUntil) chain = chain.filter((c) => !c.primary);

  // Try each model in turn. A model's request is "committed" only once it emits
  // real content; if it fails before that (a 429 hits on the first API call), we
  // discard its buffered start chunks and fall through to the next model - so
  // the shopper sees one clean stream from whichever model actually answered.
  const stream = createUIMessageStream<AuraUIMessage>({
    onError: friendlyError,
    execute: async ({ writer }) => {
      let lastError: unknown = new Error("No model available");
      for (let i = 0; i < chain.length; i++) {
        const entry = chain[i];
        const isLast = i === chain.length - 1;
        const result = streamText({
          model: entry.model,
          system,
          messages: modelMessages,
          tools,
          stopWhen: stepCountIs(6),
          // Fail fast on non-final models so we fall back without long backoff.
          maxRetries: isLast ? 2 : 0,
        });

        const buffered: InferUIMessageChunk<AuraUIMessage>[] = [];
        let committed = false;
        let failed: unknown = null;
        try {
          for await (const chunk of result.toUIMessageStream<AuraUIMessage>({
            onError: (e) => {
              failed = e;
              return friendlyError(e);
            },
          })) {
            if (chunk.type === "error") {
              failed ??= chunk.errorText;
              break;
            }
            if (!committed && !isDurableChunk(chunk.type)) {
              buffered.push(chunk); // hold reasoning/tool-input/structural until real output
              continue;
            }
            if (!committed) {
              committed = true;
              for (const b of buffered) writer.write(b);
              buffered.length = 0;
            }
            writer.write(chunk);
          }
        } catch (e) {
          failed = e;
        }

        if (!failed) {
          for (const b of buffered) writer.write(b); // flush an empty/structural turn
          return;
        }

        lastError = failed;
        if (entry.primary && readRateLimit(failed).limited) {
          const { retryMs } = readRateLimit(failed);
          primaryCooldownUntil = Date.now() + Math.min(Math.max(retryMs, 30_000), 15 * 60_000);
        }
        console.error(
          `[aura/chat] ${entry.label} failed${committed ? " mid-stream" : ""}:`,
          failed instanceof Error ? failed.message : JSON.stringify(failed),
        );

        // Once content has streamed, we can't cleanly swap models - surface it.
        if (committed || isLast) throw lastError;
      }
      throw lastError;
    },
  });

  return createUIMessageStreamResponse({ stream });
}
