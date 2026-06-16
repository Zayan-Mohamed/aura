"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { X, Lock, Check, LogIn } from "lucide-react";
import { TIERS, tierForOrders, tierProgress } from "@/lib/tiers";
import { TIER_ICONS } from "./tier-badge";
import { cn } from "@/lib/utils";

/**
 * The Aura Prestige ladder — a slide-in panel (from the right, to sit opposite
 * the left chat sidebar) showing every tier, its perks, and where the shopper
 * stands. Signed-in shoppers get a live "You're here" marker + progress to the
 * next rung; guests see the whole ladder locked, with a nudge to sign in.
 */
export function TierSidebar({
  open,
  onClose,
  signedIn,
  orderCount,
  onSignIn,
}: {
  open: boolean;
  onClose: () => void;
  signedIn: boolean;
  orderCount: number;
  onSignIn: () => void;
}) {
  const reduce = useReducedMotion();
  const [mounted, setMounted] = React.useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!mounted) return null;

  const prog = tierProgress(orderCount);
  const current = signedIn ? tierForOrders(orderCount) : null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-foreground/30 backdrop-blur-sm"
          />
          <motion.aside
            key="panel"
            aria-label="Aura Prestige tiers"
            initial={reduce ? { opacity: 0 } : { x: "100%" }}
            animate={reduce ? { opacity: 1 } : { x: 0 }}
            exit={reduce ? { opacity: 0 } : { x: "100%" }}
            transition={reduce ? { duration: 0.15 } : { type: "spring", stiffness: 380, damping: 38 }}
            className="glass fixed inset-y-0 right-0 z-50 flex w-[88%] max-w-sm flex-col border-l border-border bg-background/95 shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-2 border-b border-border/70 px-4 py-3">
              <div className="min-w-0">
                <p className="font-heading text-base leading-tight text-foreground">Aura Prestige</p>
                <p className="truncate text-[0.7rem] tracking-wide text-muted-foreground">
                  {signedIn && current
                    ? `You're ${current.name} · ${orderCount} order${orderCount === 1 ? "" : "s"}`
                    : "Shop with Aura to climb the ladder"}
                </p>
              </div>
              <button
                type="button"
                aria-label="Close tiers"
                onClick={onClose}
                className="grid size-8 shrink-0 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="aura-scroll flex-1 overflow-y-auto px-4 py-4">
              {/* Live status / progress — signed-in shoppers only */}
              {signedIn && current && (
                <div className={cn("mb-4 rounded-2xl p-4 ring-1 ring-inset", current.color.soft, current.color.ring)}>
                  <div className="flex items-center gap-2">
                    {(() => {
                      const Icon = TIER_ICONS[current.id];
                      return (
                        <span className={cn("grid size-9 place-items-center rounded-xl ring-1 ring-inset", current.color.chip, current.color.ring)}>
                          <Icon className="size-4" />
                        </span>
                      );
                    })()}
                    <div className="min-w-0">
                      <p className={cn("font-heading text-lg leading-none", current.color.text)}>{current.name}</p>
                      <p className="mt-0.5 text-[0.7rem] text-muted-foreground">{current.unlock} unlocked</p>
                    </div>
                  </div>

                  {prog.next ? (
                    <div className="mt-3">
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-foreground/10">
                        <div
                          className={cn("h-full rounded-full transition-all", prog.next.color.solid)}
                          style={{ width: `${prog.pct}%` }}
                        />
                      </div>
                      <p className="mt-1.5 text-[0.7rem] text-muted-foreground">
                        {prog.ordersToNext === 0
                          ? `One more checkout to reach ${prog.next.name}`
                          : `${prog.ordersToNext} more order${prog.ordersToNext === 1 ? "" : "s"} to ${prog.next.name}`}
                      </p>
                    </div>
                  ) : (
                    <p className="mt-3 text-[0.7rem] text-muted-foreground">
                      You&apos;ve reached the top — thank you for shopping with Aura. ✦
                    </p>
                  )}
                </div>
              )}

              {/* Guest nudge */}
              {!signedIn && (
                <button
                  type="button"
                  onClick={onSignIn}
                  className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background transition-colors hover:bg-foreground/85"
                >
                  <LogIn className="size-4" /> Sign in to start at Bronze
                </button>
              )}

              {/* The full ladder */}
              <ol className="flex flex-col gap-2.5">
                {TIERS.map((tier) => {
                  const Icon = TIER_ICONS[tier.id];
                  const unlocked = signedIn && orderCount >= tier.minOrders;
                  const isCurrent = current?.id === tier.id;
                  return (
                    <li
                      key={tier.id}
                      className={cn(
                        "rounded-2xl border p-3.5 transition-colors",
                        isCurrent
                          ? cn("border-transparent ring-1 ring-inset", tier.color.soft, tier.color.ring)
                          : "border-border/70 bg-card/40",
                        !unlocked && !isCurrent && "opacity-70",
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={cn(
                            "grid size-9 shrink-0 place-items-center rounded-xl ring-1 ring-inset",
                            unlocked || isCurrent
                              ? cn(tier.color.chip, tier.color.ring)
                              : "bg-muted text-muted-foreground ring-border",
                          )}
                        >
                          <Icon className="size-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className={cn("font-heading text-base leading-none", (unlocked || isCurrent) && tier.color.text)}>
                              {tier.name}
                            </p>
                            {isCurrent ? (
                              <span className={cn("rounded-full px-1.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wider ring-1 ring-inset", tier.color.chip, tier.color.ring)}>
                                You&apos;re here
                              </span>
                            ) : unlocked ? (
                              <Check className="size-3.5 text-jade" />
                            ) : (
                              <Lock className="size-3 text-muted-foreground" />
                            )}
                          </div>
                          <p className="mt-1 text-[0.7rem] font-medium uppercase tracking-widest text-muted-foreground">
                            {tier.minOrders === 0
                              ? "Entry"
                              : `${tier.minOrders}+ order${tier.minOrders === 1 ? "" : "s"}`}
                            {" · "}
                            {tier.unlock}
                          </p>
                          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{tier.tagline}</p>
                          <ul className="mt-2 flex flex-col gap-1">
                            {tier.perks.map((perk) => (
                              <li key={perk} className="flex items-start gap-1.5 text-[0.72rem] text-foreground/80">
                                <span className={cn("mt-1 size-1 shrink-0 rounded-full", (unlocked || isCurrent) ? tier.color.solid : "bg-muted-foreground/50")} />
                                <span>{perk}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>

              <p className="mt-4 px-1 text-center text-[0.7rem] leading-relaxed text-muted-foreground/80">
                Every completed order moves you up. Perks stack as you climb.
              </p>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
