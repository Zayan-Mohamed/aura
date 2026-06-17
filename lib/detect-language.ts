/**
 * Lightweight, zero-latency language/dialect detector for the shopper's latest
 * message. The chat model (gpt-oss-120b) mirrors languages well in isolation,
 * but the instruction gets diluted in a long system prompt mid-conversation -
 * so we detect the dialect here and inject a loud, per-turn directive.
 *
 * Five buckets, matching the system prompt:
 *  - sinhala / tamil  → native script (Unicode range hit)
 *  - singlish         → Romanized Sinhala + English
 *  - tanglish         → Romanized TAMIL + English (the HARD-to-confuse case)
 *  - english          → plain English / unknown (let the model mirror naturally)
 */
export type DetectedLanguage = "sinhala" | "tamil" | "singlish" | "tanglish" | "english";

// Romanized-Tamil markers (Tanglish). Chosen to NOT overlap with Sinhala romanization.
const TANGLISH = [
  "venum", "vennum", "iruku", "irukku", "irukka", "panren", "panran", "pannunga",
  "pannalam", "panni", "epdi", "eppadi", "nalaikku", "indaikku", "edhu", "edho",
  "enaku", "enakku", "unaku", "naan", "neenga", "unga", "romba", "konjam",
  "thaan", "illa", "illai", "vera", "vena", "kekanum", "kudunga", "seri", "ennoda",
  "ungaluku", "pidikkudhu", "pidikuma", "vaanga", "poreela", "dhan",
];

// Romanized-Sinhala markers (Singlish).
const SINGLISH = [
  "mata", "mage", "oyaa", "oyage", "ekak", "ekata", "eke", "tiyenawa", "thiyenawa",
  "tiyenawada", "thiyenawada", "one", "ona", "onida", "kohomada", "machang", "machan",
  "patta", "nathuwa", "naha", "nehe", "karanna", "karanawa", "denna", "ganna",
  "puluwan", "puluwanda", "hari", "heta", "kiyala", "kiyanna", "mokak", "monawa",
  "wage", "vage", "balanna", "loku", "podi", "hodayi", "honda", "aiyo", "ane",
];

function countHits(text: string, words: string[]): number {
  const toks = new Set(text.toLowerCase().split(/[^a-z]+/));
  return words.reduce((n, w) => n + (toks.has(w) ? 1 : 0), 0);
}

export function detectLanguage(text: string): DetectedLanguage {
  if (!text || !text.trim()) return "english";
  // Native scripts win immediately (Tamil U+0B80-0BFF, Sinhala U+0D80-0DFF).
  if (/[஀-௿]/.test(text)) return "tamil";
  if (/[඀-෿]/.test(text)) return "sinhala";

  const tanglish = countHits(text, TANGLISH);
  const singlish = countHits(text, SINGLISH);
  if (tanglish === 0 && singlish === 0) return "english";
  // Tie-break toward Tanglish: its markers are rarer/more specific, and confusing
  // Tanglish for Singlish (Tamil ↔ Sinhala) is the worst error we can make.
  return tanglish >= singlish ? "tanglish" : "singlish";
}

/** Returns the latest user message's plain text from the AI SDK parts model. */
export function latestUserText(
  messages: { role: string; parts?: { type: string; text?: string }[] }[],
): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== "user") continue;
    const text = (m.parts ?? [])
      .filter((p) => p.type === "text" && typeof p.text === "string")
      .map((p) => p.text as string)
      .join(" ")
      .trim();
    if (text) return text;
  }
  return "";
}
