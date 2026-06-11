/**
 * Hand-written row types for Aura's tables (kept in sync with
 * supabase/migrations). Used to type the Supabase client without a generated
 * schema dump.
 */
import type { ShopperProfile } from "@/lib/use-profile";
import type { BasketItem } from "@/lib/use-basket";

export type ProfileRow = {
  id: string;
  name: string;
  phone: string;
  city: string;
  address: string;
  language: ShopperProfile["language"];
  notes: string;
  updated_at: string;
};

export type BasketRow = {
  user_id: string;
  items: BasketItem[];
  updated_at: string;
};

export type ConversationRow = {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

export type MessageRow = {
  id: string;
  conversation_id: string;
  user_id: string;
  role: "user" | "assistant" | "system";
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  parts: any[];
  created_at: string;
};

export type OrderRow = {
  id: string;
  user_id: string;
  conversation_id: string | null;
  order_ref: string;
  checkout_url: string | null;
  status: string;
  items: unknown;
  summary: unknown;
  recipient: unknown;
  delivery: unknown;
  expires_at: string | null;
  created_at: string;
};
