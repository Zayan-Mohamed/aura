/**
 * Public checkout for a SHARED chat. A visitor (no account) builds a basket from
 * the shared products and submits delivery details here; we create a real
 * Kapruka guest-checkout link and return it. This is the same guest-checkout
 * capability the chat already exposes, with light per-IP throttling on top.
 */
import * as kapruka from "@/lib/kapruka";

export const runtime = "nodejs";
export const maxDuration = 30;

// Best-effort per-IP cooldown (per warm instance) to blunt link-farming. Kapruka
// also enforces its own 30-orders/hour limit upstream.
const lastByIp = new Map<string, number>();
const COOLDOWN_MS = 4000;

type Body = {
  items?: { productId?: string; quantity?: number; icingText?: string }[];
  recipient?: { name?: string; phone?: string };
  delivery?: { address?: string; city?: string; date?: string };
  sender?: { name?: string };
};

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon";
  const now = Date.now();
  if (now - (lastByIp.get(ip) ?? 0) < COOLDOWN_MS) {
    return Response.json({ error: "One moment — please try again in a few seconds." }, { status: 429 });
  }
  lastByIp.set(ip, now);

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const cart = (Array.isArray(body.items) ? body.items : [])
    .filter((i) => i?.productId)
    .map((i) => ({
      productId: String(i.productId),
      quantity: Math.min(99, Math.max(1, Number(i.quantity) || 1)),
      ...(i.icingText ? { icingText: String(i.icingText).slice(0, 120) } : {}),
    }));
  if (cart.length === 0) return Response.json({ error: "Your basket is empty." }, { status: 422 });
  if (cart.length > 30) return Response.json({ error: "That's too many items for one order." }, { status: 422 });

  const { recipient, delivery, sender } = body;
  if (
    !recipient?.name ||
    !recipient?.phone ||
    !delivery?.address ||
    !delivery?.city ||
    !delivery?.date ||
    !sender?.name
  ) {
    return Response.json({ error: "Please fill in all the delivery details." }, { status: 422 });
  }

  const res = await kapruka.createOrder({
    cart,
    recipient: { name: String(recipient.name).slice(0, 120), phone: String(recipient.phone).slice(0, 40) },
    delivery: {
      address: String(delivery.address).slice(0, 240),
      city: String(delivery.city).slice(0, 80),
      date: String(delivery.date).slice(0, 10),
    },
    sender: { name: String(sender.name).slice(0, 120) },
  });
  if ("error" in res) return Response.json({ error: res.error }, { status: 502 });

  return Response.json({ order: res });
}
