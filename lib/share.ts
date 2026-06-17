/**
 * Share helpers. Sri Lanka is WhatsApp-first - gifts get paid for by forwarding
 * a link to whoever holds the card. A wa.me deep link opens WhatsApp (app or
 * web) with the message pre-filled; the user picks the recipient. We also expose
 * the native Web Share sheet where available (mobile), falling back to WhatsApp.
 */

/** Build a wa.me deep link with a pre-filled message. */
export function whatsappLink(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

/**
 * Share via the native share sheet when present (mobile), else open WhatsApp.
 * Returns a promise that resolves once the action is taken/dismissed.
 */
export async function shareText(text: string, title = "Aura"): Promise<void> {
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({ title, text });
      return;
    } catch {
      // User dismissed, or share failed - fall through to WhatsApp.
    }
  }
  if (typeof window !== "undefined") {
    window.open(whatsappLink(text), "_blank", "noopener,noreferrer");
  }
}
