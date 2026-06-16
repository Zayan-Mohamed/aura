/**
 * Cloud persistence helpers — thin wrappers over Supabase queries used by the
 * signed-in experience (profile, basket, chat history, orders). Every call runs
 * as the signed-in user, so Row-Level Security guarantees per-user isolation.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ShopperProfile } from "@/lib/use-profile";
import { EMPTY_PROFILE } from "@/lib/use-profile";
import type { BasketItem } from "@/lib/use-basket";
import type { AuraUIMessage } from "@/lib/ai-types";
import type { ConversationRow, OccasionRow, OrderRow, ProfileRow } from "@/lib/supabase/types";

type DB = SupabaseClient;

// ----------------------------------------------------------------- profile

export async function fetchProfile(db: DB, userId: string): Promise<ShopperProfile | null> {
  const { data } = await db
    .from("profiles")
    .select("name,phone,city,address,language,notes")
    .eq("id", userId)
    .maybeSingle<Partial<ProfileRow>>();
  if (!data) return null;
  return {
    name: data.name ?? "",
    phone: data.phone ?? "",
    city: data.city ?? "",
    address: data.address ?? "",
    language: (data.language as ShopperProfile["language"]) ?? "auto",
    notes: data.notes ?? "",
  };
}

export async function upsertProfile(db: DB, userId: string, profile: ShopperProfile) {
  await db
    .from("profiles")
    .upsert({ id: userId, ...profile, updated_at: new Date().toISOString() });
}

// ------------------------------------------------------------------ basket

export async function fetchBasket(db: DB, userId: string): Promise<BasketItem[] | null> {
  const { data } = await db
    .from("baskets")
    .select("items")
    .eq("user_id", userId)
    .maybeSingle<{ items: BasketItem[] }>();
  return data?.items ?? null;
}

export async function upsertBasket(db: DB, userId: string, items: BasketItem[]) {
  await db
    .from("baskets")
    .upsert({ user_id: userId, items, updated_at: new Date().toISOString() });
}

// ----------------------------------------------------------- conversations

export async function listConversations(db: DB, userId: string): Promise<ConversationRow[]> {
  const { data } = await db
    .from("conversations")
    .select("id,user_id,title,created_at,updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(100);
  return (data as ConversationRow[]) ?? [];
}

export async function createConversation(db: DB, userId: string, title: string): Promise<string | null> {
  const { data } = await db
    .from("conversations")
    .insert({ user_id: userId, title: title.slice(0, 80) || "New chat" })
    .select("id")
    .single<{ id: string }>();
  return data?.id ?? null;
}

export async function touchConversation(db: DB, id: string) {
  await db.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", id);
}

export async function deleteConversation(db: DB, id: string) {
  await db.from("conversations").delete().eq("id", id);
}

// --------------------------------------------------------------- messages

export async function loadMessages(db: DB, conversationId: string): Promise<AuraUIMessage[]> {
  const { data } = await db
    .from("messages")
    .select("id,role,parts")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (!data) return [];
  return data.map((m) => ({
    id: m.id as string,
    role: m.role as AuraUIMessage["role"],
    parts: (m.parts ?? []) as AuraUIMessage["parts"],
  })) as AuraUIMessage[];
}

/** Delete specific messages by id — used when an edited turn truncates the chat. */
export async function deleteMessages(db: DB, ids: string[]) {
  if (ids.length === 0) return;
  await db.from("messages").delete().in("id", ids);
}

/** Idempotent upsert of a turn's messages (keyed by AI SDK message id). */
export async function saveMessages(
  db: DB,
  conversationId: string,
  userId: string,
  messages: AuraUIMessage[],
) {
  if (messages.length === 0) return;
  const rows = messages.map((m) => ({
    id: m.id,
    conversation_id: conversationId,
    user_id: userId,
    role: m.role,
    parts: m.parts,
  }));
  await db.from("messages").upsert(rows, { onConflict: "id" });
}

// ----------------------------------------------------------------- orders

/**
 * A persisted order line. We store the productId + quantity (from the createOrder
 * tool input) AND, when we can match it against the basket at checkout time, the
 * name/price/image — so one-tap reorder can rebuild the basket with real items
 * instead of asking the shopper to remember what they bought.
 */
export type SavedOrderItem = {
  productId: string;
  quantity: number;
  icingText?: string;
  name?: string;
  price?: BasketItem["price"];
  imageUrl?: string;
  url?: string;
};

type OrderToSave = {
  orderRef: string;
  checkoutUrl?: string;
  items?: SavedOrderItem[];
  summary?: unknown;
  recipient?: unknown;
  delivery?: unknown;
  expiresAt?: string;
};

export async function saveOrder(
  db: DB,
  userId: string,
  conversationId: string | null,
  order: OrderToSave,
) {
  await db.from("orders").upsert(
    {
      user_id: userId,
      conversation_id: conversationId,
      order_ref: order.orderRef,
      checkout_url: order.checkoutUrl ?? null,
      items: order.items ?? [],
      summary: order.summary ?? null,
      recipient: order.recipient ?? null,
      delivery: order.delivery ?? null,
      expires_at: order.expiresAt ?? null,
    },
    { onConflict: "order_ref" },
  );
}

/**
 * Pull any createOrder tool outputs out of an assistant message's parts. The
 * cart (productId + quantity) lives on the tool INPUT (the output omits it), so
 * we read it there; passing the current `basket` lets us enrich each line with
 * the name/price/image (matched by productId) for a richer reorder later.
 */
export function ordersFromMessages(
  messages: AuraUIMessage[],
  basket: BasketItem[] = [],
): OrderToSave[] {
  const out: OrderToSave[] = [];
  for (const m of messages) {
    if (m.role !== "assistant") continue;
    for (const part of m.parts as {
      type?: string;
      input?: Record<string, unknown>;
      output?: Record<string, unknown>;
    }[]) {
      if (part?.type === "tool-createOrder" && part.output && !("error" in part.output)) {
        const o = part.output;
        if (typeof o.orderRef === "string") {
          const cart = (Array.isArray(part.input?.cart) ? part.input!.cart : []) as {
            productId?: string;
            quantity?: number;
            icingText?: string;
          }[];
          const items: SavedOrderItem[] = cart
            .filter((c) => c.productId)
            .map((c) => {
              const match = basket.find((b) => b.productId === c.productId);
              return {
                productId: c.productId as string,
                quantity: c.quantity ?? 1,
                ...(c.icingText ? { icingText: c.icingText } : {}),
                ...(match
                  ? { name: match.name, price: match.price, imageUrl: match.imageUrl, url: match.url }
                  : {}),
              };
            });
          out.push({
            orderRef: o.orderRef,
            checkoutUrl: o.checkoutUrl as string | undefined,
            items,
            recipient: part.input?.recipient,
            delivery: part.input?.delivery,
            summary: o.summary,
            expiresAt: o.expiresAt as string | undefined,
          });
        }
      }
    }
  }
  return out;
}

// --------------------------------------------------------------- occasions

/** A saved gifting occasion (birthday, anniversary) the shopper wants reminding about. */
export type Occasion = {
  id: string;
  label: string;
  occasionDate: string; // YYYY-MM-DD
  recipientName: string;
  recipientCity: string;
};

function toOccasion(r: OccasionRow): Occasion {
  return {
    id: r.id,
    label: r.label,
    occasionDate: r.occasion_date,
    recipientName: r.recipient_name ?? "",
    recipientCity: r.recipient_city ?? "",
  };
}

export async function listOccasions(db: DB, userId: string): Promise<Occasion[]> {
  const { data } = await db
    .from("occasions")
    .select("id,label,occasion_date,recipient_name,recipient_city,notes,last_notified_year,created_at,user_id")
    .eq("user_id", userId)
    .order("occasion_date", { ascending: true });
  return ((data as OccasionRow[]) ?? []).map(toOccasion);
}

export async function addOccasion(
  db: DB,
  userId: string,
  o: { label: string; occasionDate: string; recipientName?: string; recipientCity?: string },
): Promise<Occasion | null> {
  const { data } = await db
    .from("occasions")
    .insert({
      user_id: userId,
      label: o.label,
      occasion_date: o.occasionDate,
      recipient_name: o.recipientName ?? "",
      recipient_city: o.recipientCity ?? "",
    })
    .select("id,label,occasion_date,recipient_name,recipient_city,notes,last_notified_year,created_at,user_id")
    .single<OccasionRow>();
  return data ? toOccasion(data) : null;
}

export async function deleteOccasion(db: DB, id: string) {
  await db.from("occasions").delete().eq("id", id);
}

/**
 * Count of the signed-in user's VERIFIED (paid) orders — drives the Aura
 * Prestige tier. Prefers the `order_count()` RPC (one round-trip, no row
 * payload); falls back to a head count of verified_orders if the RPC is
 * unavailable, so it degrades gracefully. Counts only orders confirmed paid via
 * Kapruka's track_order (see recordVerifiedOrder), never raw checkout links.
 */
export async function countOrders(db: DB, userId: string): Promise<number> {
  const rpc = await db.rpc("order_count");
  if (!rpc.error && typeof rpc.data === "number") return rpc.data;
  const { count } = await db
    .from("verified_orders")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  return count ?? 0;
}

/**
 * Record a Kapruka order number the shopper has proven paid (a successful,
 * non-cancelled track_order). De-duplicated on the globally-unique order_number
 * (ON CONFLICT DO NOTHING), so re-tracking the same order — or claiming one
 * already verified by another account — adds nothing. Returns true only when a
 * brand-new row was inserted (i.e. the tier just gained a step).
 */
export async function recordVerifiedOrder(
  db: DB,
  userId: string,
  order: { orderNumber: string; status?: string; amount?: string | null; recipientName?: string | null },
): Promise<boolean> {
  const { data, error } = await db
    .from("verified_orders")
    .upsert(
      {
        user_id: userId,
        order_number: order.orderNumber,
        status: order.status ?? "",
        amount: order.amount ?? null,
        recipient_name: order.recipientName ?? null,
      },
      { onConflict: "order_number", ignoreDuplicates: true },
    )
    .select("id");
  if (error) return false;
  return Array.isArray(data) && data.length > 0;
}

/** Recent orders for the signed-in user (newest first) — powers reorder. */
export async function listOrders(db: DB, userId: string): Promise<OrderRow[]> {
  const { data } = await db
    .from("orders")
    .select("id,order_ref,checkout_url,status,items,summary,recipient,delivery,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);
  return (data as OrderRow[]) ?? [];
}

// ----------------------------------------------------------- shared chats

/**
 * Mint a public, unguessable share link for the current conversation. Stores a
 * frozen snapshot of the messages (strip large metadata before calling). Returns
 * the token, or null on failure. Read back publicly via the get_shared_chat RPC.
 */
export async function createShare(
  db: DB,
  userId: string,
  title: string,
  messages: unknown[],
): Promise<string | null> {
  const token = crypto.randomUUID().replace(/-/g, "");
  const { error } = await db.from("shared_chats").insert({
    token,
    user_id: userId,
    title: (title || "Shared chat").slice(0, 120),
    messages,
  });
  return error ? null : token;
}

export { EMPTY_PROFILE };
