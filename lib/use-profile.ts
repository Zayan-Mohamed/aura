"use client";

/**
 * Shopper profile — the few details Aura reuses across a conversation so the
 * user doesn't have to repeat them: where it's going (powers Proactive Delivery
 * Confidence from the first message) and who to bill/contact (speeds checkout).
 *
 * Stored only on the user's device (localStorage). It is sent to the chat API
 * on each turn and injected into the system prompt — never persisted server-side.
 */
import * as React from "react";

export type ShopperLanguage = "auto" | "english" | "sinhala" | "tanglish";

export type ShopperProfile = {
  name: string;
  phone: string;
  city: string;
  address: string;
  language: ShopperLanguage;
  notes: string;
};

export const EMPTY_PROFILE: ShopperProfile = {
  name: "",
  phone: "",
  city: "",
  address: "",
  language: "auto",
  notes: "",
};

const STORAGE_KEY = "aura-profile";

function readProfile(): ShopperProfile {
  if (typeof window === "undefined") return EMPTY_PROFILE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_PROFILE;
    const parsed = JSON.parse(raw) as Partial<ShopperProfile>;
    return { ...EMPTY_PROFILE, ...parsed };
  } catch {
    return EMPTY_PROFILE;
  }
}

/** True when the user has filled in anything Aura can act on. */
export function profileHasContent(p: ShopperProfile): boolean {
  return Boolean(p.name || p.phone || p.city || p.address || p.notes);
}

/**
 * Reactive, localStorage-backed shopper profile. Hydration-safe: starts empty on
 * the server + first client render, then loads the stored value after mount to
 * avoid an SSR mismatch. `hydrated` lets callers avoid acting on empty data early.
 */
export function useProfile() {
  const [profile, setProfile] = React.useState<ShopperProfile>(EMPTY_PROFILE);
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    // Load persisted profile after mount to avoid an SSR/client hydration mismatch.
    /* eslint-disable react-hooks/set-state-in-effect */
    setProfile(readProfile());
    setHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const update = React.useCallback((patch: Partial<ShopperProfile>) => {
    setProfile((prev) => {
      const next = { ...prev, ...patch };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* storage full / unavailable — keep in-memory only */
      }
      return next;
    });
  }, []);

  const clear = React.useCallback(() => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setProfile(EMPTY_PROFILE);
  }, []);

  return { profile, update, clear, hydrated };
}
