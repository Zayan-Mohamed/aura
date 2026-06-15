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
import type { ConversationRow, OrderRow, ProfileRow } from "@/lib/supabase/types";

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

type OrderToSave = {
  orderRef: string;
  checkoutUrl?: string;
  items?: unknown;
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

/** Pull any createOrder tool outputs out of an assistant message's parts. */
export function ordersFromMessages(messages: AuraUIMessage[]): OrderToSave[] {
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
          out.push({
            orderRef: o.orderRef,
            checkoutUrl: o.checkoutUrl as string | undefined,
            // The cart the order was built from lives on the tool INPUT — capture
            // it so we can offer one-tap reorder later (the output omits items).
            items: Array.isArray(part.input?.cart) ? part.input!.cart : [],
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

export { EMPTY_PROFILE };
