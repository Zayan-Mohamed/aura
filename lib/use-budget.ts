"use client";

/**
 * Budget guardian - an optional spend ceiling the shopper sets for their basket.
 * When set, the basket shows a running "Rs X of Rs Y" progress bar and warns
 * gently when they go over, so the bill never surprises them at checkout.
 *
 * Like the basket, it lives in a tiny module-level store backed by localStorage
 * and read reactively via useSyncExternalStore. Null = no budget set.
 */
import * as React from "react";

const STORAGE_KEY = "aura-budget";

let budget: number | null = null;
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}
function hydrate() {
  if (hydrated) return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw != null) {
      const n = Number(raw);
      budget = Number.isFinite(n) && n > 0 ? n : null;
    }
  } catch {
    /* ignore */
  }
}

export const budgetStore = {
  subscribe(cb: () => void) {
    listeners.add(cb);
    return () => listeners.delete(cb);
  },
  snapshot() {
    return budget;
  },
  set(value: number | null) {
    hydrated = true;
    budget = value && value > 0 ? value : null;
    try {
      if (budget == null) window.localStorage.removeItem(STORAGE_KEY);
      else window.localStorage.setItem(STORAGE_KEY, String(budget));
    } catch {
      /* ignore */
    }
    emit();
  },
};

/** Reactive view of the basket budget. SSR-safe (server snapshot is null). */
export function useBudget() {
  React.useEffect(() => {
    if (!hydrated) {
      hydrate();
      emit();
    }
  }, []);

  const value = React.useSyncExternalStore(
    budgetStore.subscribe,
    budgetStore.snapshot,
    () => null,
  );
  return { budget: value, setBudget: budgetStore.set };
}
