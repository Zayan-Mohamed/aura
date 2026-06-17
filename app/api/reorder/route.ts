/**
 * One-tap reorder. Rebuilds a previous order's cart + saved recipient/address,
 * picks the soonest valid delivery date, and creates a fresh Kapruka checkout
 * link directly - no AI round-trip, no questions. Signed-in only (RLS scopes the
 * lookup to the caller's own orders).
 */
import { createClient } from "@/lib/supabase/server";
import { fetchProfile, saveOrder, type SavedOrderItem } from "@/lib/cloud";
import * as kapruka from "@/lib/kapruka";

export const runtime = "nodejs";
export const maxDuration = 30;

/** Tomorrow's date (YYYY-MM-DD, Asia/Colombo) - a safe soonest delivery target. */
function soonestDate(): string {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Colombo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const d = new Date(`${today}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

export async function POST(req: Request) {
  let orderId: string | undefined;
  try {
    const body = (await req.json()) as { orderId?: string };
    orderId = typeof body.orderId === "string" ? body.orderId : undefined;
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (!orderId) return Response.json({ error: "Missing orderId" }, { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Please sign in to reorder." }, { status: 401 });

  const { data: order } = await supabase
    .from("orders")
    .select("recipient, delivery, items")
    .eq("id", orderId)
    .eq("user_id", user.id)
    .maybeSingle<{ recipient: unknown; delivery: unknown; items: unknown }>();
  if (!order) return Response.json({ error: "Order not found." }, { status: 404 });

  const items = (Array.isArray(order.items) ? order.items : []) as SavedOrderItem[];
  const cart = items
    .filter((i) => i.productId)
    .map((i) => ({
      productId: i.productId,
      quantity: i.quantity ?? 1,
      ...(i.icingText ? { icingText: i.icingText } : {}),
    }));
  if (cart.length === 0) {
    return Response.json({ error: "This order has no items we can reorder." }, { status: 422 });
  }

  const recipient = (order.recipient ?? {}) as { name?: string; phone?: string };
  const delivery = (order.delivery ?? {}) as {
    address?: string;
    city?: string;
    locationType?: "house" | "apartment" | "office" | "other";
    instructions?: string;
  };
  if (!recipient.name || !recipient.phone || !delivery.address || !delivery.city) {
    return Response.json(
      { error: "This order is missing the saved delivery details needed for one-tap reorder." },
      { status: 422 },
    );
  }

  const profile = await fetchProfile(supabase, user.id);
  const senderName = profile?.name?.trim() || recipient.name;
  const date = soonestDate();

  const res = await kapruka.createOrder({
    cart,
    recipient: { name: recipient.name, phone: recipient.phone },
    delivery: {
      address: delivery.address,
      city: delivery.city,
      date,
      locationType: delivery.locationType,
      instructions: delivery.instructions,
    },
    sender: { name: senderName },
  });
  if ("error" in res) return Response.json({ error: res.error }, { status: 502 });

  // Persist the fresh checkout so it joins the reorder list (with enriched items).
  await saveOrder(supabase, user.id, null, {
    orderRef: res.orderRef,
    checkoutUrl: res.checkoutUrl,
    items,
    summary: res.summary,
    recipient,
    delivery: { ...delivery, date },
    expiresAt: res.expiresAt,
  });

  return Response.json({ order: res });
}
