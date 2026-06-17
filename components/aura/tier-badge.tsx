"use client";

import { Sparkle, Medal, Award, Gem, Crown, type LucideIcon } from "lucide-react";
import type { TierId } from "@/lib/tiers";
import { tierForOrders } from "@/lib/tiers";
import { cn } from "@/lib/utils";

/** Lucide icon per tier - kept in the UI layer so lib/tiers.ts stays pure data. */
export const TIER_ICONS: Record<TierId, LucideIcon> = {
  bronze: Sparkle,
  silver: Medal,
  gold: Award,
  diamond: Gem,
  aura: Crown,
};

/**
 * The prestige chip beside the "Aura" wordmark. Signed-in shoppers see their
 * current tier (icon + name, in the tier's colour); guests see an "empty"
 * placeholder. Either way, tapping it opens the full ladder.
 */
export function TierBadge({
  orderCount,
  onClick,
}: {
  /** Orders placed, or null when the shopper isn't signed in. */
  orderCount: number | null;
  onClick: () => void;
}) {
  if (orderCount === null) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label="View Aura prestige tiers"
        className="inline-flex shrink-0 items-center gap-1 rounded-full border border-dashed border-border px-2 py-0.5 text-[0.7rem] font-medium text-muted-foreground transition-colors hover:border-gold/40 hover:text-foreground"
      >
        <Crown className="size-3 opacity-50" />
        <span className="hidden sm:inline">Tiers</span>
      </button>
    );
  }

  const tier = tierForOrders(orderCount);
  const Icon = TIER_ICONS[tier.id];
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Aura ${tier.name} member - view prestige tiers`}
      title={`Aura ${tier.name} · ${tier.unlock}`}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[0.7rem] font-semibold tracking-wide ring-1 ring-inset transition-transform hover:scale-105",
        tier.color.chip,
        tier.color.ring,
      )}
    >
      <Icon className="size-3" />
      <span>{tier.name}</span>
    </button>
  );
}
