"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { X, RotateCcw, MapPin, CalendarClock, Loader2, AlertTriangle } from "lucide-react";
import type { OrderRow } from "@/lib/supabase/types";
import type { OrderConfirmation } from "@/lib/kapruka";
import { formatMoney } from "@/lib/format";
import { ProductImage } from "./product-image";
import { CheckoutCard } from "./checkout-card";

type Line = { productId?: string; quantity?: number; name?: string; price?: { amount: number | null; currency: string }; imageUrl?: string };

/** Tomorrow (Asia/Colombo), shown so the shopper knows the soonest delivery day. */
function soonestLabel(): string {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Colombo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const d = new Date(`${today}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return new Intl.DateTimeFormat("en-LK", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(d);
}

/**
 * One-tap reorder confirmation. Shows the saved items + delivery details and,
 * on confirm, hits /api/reorder which rebuilds the order and returns a fresh
 * Kapruka pay link directly - no AI, no questions.
 */
export function ReorderDialog({
  order,
  onClose,
  onReordered,
}: {
  order: OrderRow | null;
  onClose: () => void;
  onReordered?: () => void;
}) {
  const reduce = useReducedMotion();
  const [mounted, setMounted] = React.useState(false);
  const [status, setStatus] = React.useState<"idle" | "loading" | "done" | "error">("idle");
  const [result, setResult] = React.useState<OrderConfirmation | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  React.useEffect(() => setMounted(true), []);

  // Reset transient state whenever a new order is opened.
  React.useEffect(() => {
    if (order) {
      /* eslint-disable react-hooks/set-state-in-effect */
      setStatus("idle");
      setResult(null);
      setError(null);
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [order]);

  React.useEffect(() => {
    if (!order) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [order, onClose]);

  if (!mounted) return null;

  const items = (Array.isArray(order?.items) ? order!.items : []) as Line[];
  const recipient = (order?.recipient ?? {}) as { name?: string };
  const delivery = (order?.delivery ?? {}) as { address?: string; city?: string };

  const confirm = async () => {
    if (!order) return;
    setStatus("loading");
    setError(null);
    try {
      const res = await fetch("/api/reorder", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ orderId: order.id }),
      });
      const data = (await res.json()) as { order?: OrderConfirmation; error?: string };
      if (!res.ok || !data.order) {
        setStatus("error");
        setError(data.error || "Couldn't rebuild that order. Please try again.");
        return;
      }
      setResult(data.order);
      setStatus("done");
      onReordered?.();
    } catch {
      setStatus("error");
      setError("Network hiccup - please try again.");
    }
  };

  return createPortal(
    <AnimatePresence>
      {order && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] grid place-items-center bg-foreground/40 p-4 backdrop-blur-sm"
          >
            <motion.div
              key="panel"
              role="dialog"
              aria-modal="true"
              aria-label="Reorder"
              onClick={(e) => e.stopPropagation()}
              initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 12 }}
              animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.97 }}
              transition={reduce ? { duration: 0.15 } : { type: "spring", stiffness: 320, damping: 28 }}
              className="aura-scroll max-h-[88vh] w-full max-w-md overflow-y-auto rounded-3xl border border-border bg-background shadow-2xl"
            >
              <div className="flex items-center justify-between gap-2 border-b border-border/70 px-5 py-4">
                <div className="flex items-center gap-2">
                  <RotateCcw className="size-4 text-gold" />
                  <span className="font-heading text-lg text-foreground">
                    {status === "done" ? "Your reorder is ready" : "Reorder"}
                  </span>
                </div>
                <button
                  type="button"
                  aria-label="Close"
                  onClick={onClose}
                  className="grid size-8 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              </div>

              {status === "done" && result ? (
                <div className="p-4">
                  <CheckoutCard order={result} />
                </div>
              ) : (
                <div className="px-5 py-4">
                  <ul className="space-y-2.5">
                    {items.map((i, idx) => (
                      <li key={i.productId ?? idx} className="flex items-center gap-3">
                        <ProductImage
                          src={i.imageUrl}
                          alt={i.name ?? "Item"}
                          className="size-12 shrink-0 overflow-hidden rounded-lg"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-1 text-sm font-medium text-foreground">
                            {i.quantity && i.quantity > 1 ? `${i.quantity}× ` : ""}
                            {i.name ?? "Item"}
                          </p>
                          {i.price && (
                            <p className="tnum text-xs text-muted-foreground">{formatMoney(i.price)}</p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-4 space-y-2 rounded-2xl border border-border bg-card/60 p-3.5 text-sm">
                    <div className="flex items-start gap-2 text-muted-foreground">
                      <MapPin className="mt-0.5 size-4 shrink-0 text-jade" />
                      <span>
                        {recipient.name ? <span className="text-foreground">{recipient.name}</span> : null}
                        {recipient.name ? " · " : ""}
                        {delivery.address}
                        {delivery.city ? `, ${delivery.city}` : ""}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <CalendarClock className="size-4 shrink-0 text-jade" />
                      <span>
                        Soonest delivery · <span className="text-foreground">{soonestLabel()}</span>
                      </span>
                    </div>
                  </div>

                  {status === "error" && error && (
                    <div className="mt-3 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3.5 py-2.5 text-sm text-destructive">
                      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={confirm}
                    disabled={status === "loading"}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-gold px-5 py-3 text-sm font-semibold tracking-wide text-gold-foreground transition-all hover:brightness-105 active:translate-y-px disabled:opacity-60"
                  >
                    {status === "loading" ? (
                      <>
                        <Loader2 className="size-4 animate-spin" /> Generating pay link…
                      </>
                    ) : (
                      <>
                        <RotateCcw className="size-4" /> Confirm & get pay link
                      </>
                    )}
                  </button>
                  <p className="mt-2 text-center text-[0.7rem] text-muted-foreground/80">
                    Same items, same address - we just need your secure payment.
                  </p>
                </div>
              )}
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
