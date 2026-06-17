"use client";

import * as React from "react";
import { motion } from "motion/react";
import { Plus, Check, History } from "lucide-react";
import type { OrderRow } from "@/lib/supabase/types";
import type { Money } from "@/lib/kapruka";
import { basketStore } from "@/lib/use-basket";
import { formatMoney } from "@/lib/format";
import { ProductImage } from "./product-image";

export type UsualItem = {
  productId: string;
  name: string;
  price: Money;
  imageUrl?: string;
  url?: string;
};

/**
 * Build a de-duplicated "buy again" list from the shopper's past orders. Orders
 * arrive newest-first, so the first time we see a product wins. We only keep
 * lines rich enough to add straight to the basket (id + name + price).
 */
export function usualsFromOrders(orders: OrderRow[], limit = 12): UsualItem[] {
  const seen = new Set<string>();
  const out: UsualItem[] = [];
  for (const order of orders) {
    const items = (Array.isArray(order.items) ? order.items : []) as {
      productId?: string;
      name?: string;
      price?: Money;
      imageUrl?: string;
      url?: string;
    }[];
    for (const i of items) {
      if (!i.productId || !i.name || !i.price || i.price.amount == null) continue;
      if (seen.has(i.productId)) continue;
      seen.add(i.productId);
      out.push({ productId: i.productId, name: i.name, price: i.price, imageUrl: i.imageUrl, url: i.url });
      if (out.length >= limit) return out;
    }
  }
  return out;
}

function UsualCard({ item }: { item: UsualItem }) {
  const [added, setAdded] = React.useState(false);
  const add = () => {
    basketStore.add({
      productId: item.productId,
      name: item.name,
      price: item.price,
      imageUrl: item.imageUrl,
      url: item.url,
    });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1400);
  };
  return (
    <div className="flex w-36 shrink-0 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <ProductImage src={item.imageUrl} alt={item.name} className="aspect-square w-full" />
      <div className="flex flex-1 flex-col gap-1 p-2.5">
        <p className="line-clamp-2 text-xs font-medium leading-snug text-card-foreground">{item.name}</p>
        <span className="tnum mt-auto pt-1 text-sm font-semibold text-card-foreground">
          {formatMoney(item.price)}
        </span>
        <button
          type="button"
          onClick={add}
          aria-label={`Add ${item.name} to basket`}
          className={`mt-1.5 flex w-full items-center justify-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-semibold transition-colors ${
            added ? "bg-jade/15 text-jade" : "bg-gold text-gold-foreground hover:brightness-105"
          }`}
        >
          {added ? (
            <>
              <Check className="size-3.5" /> Added
            </>
          ) : (
            <>
              <Plus className="size-3.5" /> Add
            </>
          )}
        </button>
      </div>
    </div>
  );
}

/**
 * A home-screen "buy it again" strip, pre-loaded from the shopper's order
 * history - so repeat purchases are one tap, no need to ask Aura to find them.
 */
export function UsualsCarousel({ items }: { items: UsualItem[] }) {
  if (items.length === 0) return null;
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.5 }}
      className="mx-auto mt-2 w-full max-w-3xl"
      aria-label="Your usuals"
    >
      <div className="mb-3 flex items-center gap-2 px-1">
        <History className="size-4 text-gold" />
        <h2 className="font-heading text-lg text-foreground">Your usuals</h2>
        <span className="text-xs text-muted-foreground">- buy it again in one tap</span>
      </div>
      <div className="aura-scroll -mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2">
        {items.map((i) => (
          <div key={i.productId} className="snap-start">
            <UsualCard item={i} />
          </div>
        ))}
      </div>
    </motion.section>
  );
}
