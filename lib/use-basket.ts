"use client";

/**
 * Client-side shopping basket - a visible, accumulating cart so shoppers can
 * tell they're building a multi-item order. Lives in a small module-level store
 * (shared across every product card + the header) backed by localStorage, read
 * reactively via useSyncExternalStore. Handed to Aura at checkout to create the
 * real multi-item Kapruka order.
 */
import * as React from "react";
import type { Money } from "@/lib/kapruka";

export type BasketItem = {
  productId: string;
  name: string;
  price: Money;
  imageUrl?: string;
  url?: string;
  quantity: number;
};

const STORAGE_KEY = "aura-basket";

let items: BasketItem[] = [];
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}
function persist() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* storage unavailable - keep in memory */
  }
}
function hydrate() {
  if (hydrated) return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) items = JSON.parse(raw) as BasketItem[];
  } catch {
    /* ignore */
  }
}

export const basketStore = {
  subscribe(cb: () => void) {
    listeners.add(cb);
    return () => listeners.delete(cb);
  },
  snapshot() {
    return items;
  },
  add(item: Omit<BasketItem, "quantity">, qty = 1) {
    hydrate();
    const existing = items.find((i) => i.productId === item.productId);
    items = existing
      ? items.map((i) => (i.productId === item.productId ? { ...i, quantity: i.quantity + qty } : i))
      : [...items, { ...item, quantity: qty }];
    persist();
    emit();
  },
  setQty(productId: string, quantity: number) {
    items =
      quantity <= 0
        ? items.filter((i) => i.productId !== productId)
        : items.map((i) => (i.productId === productId ? { ...i, quantity } : i));
    persist();
    emit();
  },
  remove(productId: string) {
    items = items.filter((i) => i.productId !== productId);
    persist();
    emit();
  },
  clear() {
    items = [];
    persist();
    emit();
  },
  /** Overwrite the whole basket (used when syncing from the cloud on sign-in). */
  replace(next: BasketItem[]) {
    hydrated = true;
    items = next;
    persist();
    emit();
  },
};

const EMPTY: BasketItem[] = [];

/** Reactive view of the basket. SSR-safe (server snapshot is always empty). */
export function useBasket() {
  React.useEffect(() => {
    if (!hydrated) {
      hydrate();
      emit();
    }
  }, []);

  const list = React.useSyncExternalStore(
    basketStore.subscribe,
    basketStore.snapshot,
    () => EMPTY,
  );

  const count = list.reduce((n, i) => n + i.quantity, 0);
  return { items: list, count, ...basketStore };
}
