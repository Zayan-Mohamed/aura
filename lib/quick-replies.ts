/**
 * Contextual quick-reply chips — tappable follow-ups shown under Aura's latest
 * reply so the shopper can keep moving without typing. Derived purely from the
 * shape of the last assistant turn (which tool cards it rendered), so they're
 * always relevant to what's on screen. The single most proven retail-bot
 * conversion nudge, and zero extra model round-trips to produce.
 */
export type QuickReply = { label: string; text: string };

type Part = { type?: string; output?: Record<string, unknown> };

function toolParts(parts: Part[]): Map<string, Part> {
  const map = new Map<string, Part>();
  for (const p of parts) {
    if (typeof p.type === "string" && p.type.startsWith("tool-")) map.set(p.type, p);
  }
  return map;
}

/** Up to four chips for an assistant message's parts (empty if nothing fits). */
export function deriveQuickReplies(parts: Part[]): QuickReply[] {
  const tools = toolParts(parts);
  const chips: QuickReply[] = [];

  const search = tools.get("tool-searchProducts") ?? tools.get("tool-visualSearch");
  const searchOut = search?.output as
    | { products?: unknown[]; deliveryContext?: unknown }
    | undefined;
  const hasProducts = Array.isArray(searchOut?.products) && searchOut!.products!.length > 0;

  if (hasProducts) {
    const many = (searchOut!.products as unknown[]).length > 1;
    chips.push({ label: "Cheaper options", text: "Show me cheaper options for these." });
    if (many) chips.push({ label: "Compare top picks", text: "Compare your top 3 picks for me." });
    chips.push({ label: "Only in stock", text: "Only show the ones in stock right now." });
    if (!searchOut?.deliveryContext)
      chips.push({ label: "Will it reach me?", text: "Will these reach my city in time? Let me give you the details." });
  }

  if (tools.has("tool-createOrder")) {
    return [
      { label: "Track this order", text: "How do I track this order once it's paid?" },
      { label: "Keep shopping", text: "Let's add a few more things." },
    ];
  }

  if (tools.has("tool-checkDelivery")) {
    chips.push({ label: "Find a gift to send", text: "Great — now help me find a gift to send there." });
  }

  if (tools.has("tool-listCategories")) {
    chips.push({ label: "What's popular?", text: "What's popular right now?" });
  }

  // De-dupe by label and cap at four so the row stays calm.
  const seen = new Set<string>();
  return chips.filter((c) => !seen.has(c.label) && seen.add(c.label)).slice(0, 4);
}
