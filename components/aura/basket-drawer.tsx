"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ShoppingBag, X, Minus, Plus, Trash2, ArrowRight } from "lucide-react";
import { useBasket } from "@/lib/use-basket";
import { formatMoney } from "@/lib/format";
import { ProductImage } from "./product-image";

export function BasketDrawer({ onCheckout }: { onCheckout: (message: string) => void }) {
  const { items, count, setQty, remove, clear } = useBasket();
  const [open, setOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const reduce = useReducedMotion();

  // eslint-disable-next-line react-hooks/set-state-in-effect
  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const currency = items.find((i) => i.price.amount != null)?.price.currency ?? "LKR";
  const subtotal = items.reduce((sum, i) => sum + (i.price.amount ?? 0) * i.quantity, 0);

  const checkout = () => {
    if (items.length === 0) return;
    const lines = items
      .map((i) => `- ${i.quantity}× ${i.name} (id: ${i.productId})`)
      .join("\n");
    onCheckout(
      `I'd like to check out my basket as one order:\n${lines}\n\nPlease confirm delivery to my area and walk me through secure checkout.`,
    );
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        aria-label={`Basket${count ? ` (${count})` : ""}`}
        onClick={() => setOpen(true)}
        className="relative grid size-9 shrink-0 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <ShoppingBag className="size-4" />
        {count > 0 && (
          <span className="absolute -right-1 -top-1 grid min-w-[1.125rem] place-items-center rounded-full bg-gold px-1 text-[0.6rem] font-bold leading-[1.125rem] text-gold-foreground ring-2 ring-background">
            {count}
          </span>
        )}
      </button>

      {mounted &&
        createPortal(
          <AnimatePresence>
            {open && (
              <>
                <motion.div
                  key="backdrop"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => setOpen(false)}
                  className="fixed inset-0 z-40 bg-foreground/30 backdrop-blur-sm"
                />
                <motion.aside
                  key="panel"
                  role="dialog"
                  aria-modal="true"
                  aria-label="Your basket"
                  initial={reduce ? { opacity: 0 } : { x: "100%" }}
                  animate={reduce ? { opacity: 1 } : { x: 0 }}
                  exit={reduce ? { opacity: 0 } : { x: "100%" }}
                  transition={reduce ? { duration: 0.15 } : { type: "spring", stiffness: 380, damping: 38 }}
                  className="glass fixed inset-y-0 right-0 z-50 flex w-[88%] max-w-sm flex-col border-l border-border bg-background/95 shadow-2xl"
                >
                  <div className="flex items-center justify-between gap-3 border-b border-border/70 px-5 py-4">
                    <p className="font-heading text-lg text-foreground">
                      Your basket{count > 0 ? ` · ${count}` : ""}
                    </p>
                    <button
                      type="button"
                      aria-label="Close"
                      onClick={() => setOpen(false)}
                      className="grid size-8 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <X className="size-4" />
                    </button>
                  </div>

                  {items.length === 0 ? (
                    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
                      <div className="grid size-12 place-items-center rounded-full bg-muted">
                        <ShoppingBag className="size-5 text-muted-foreground" />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Your basket is empty. Tap <span className="font-medium text-foreground">Add to basket</span> on
                        any product to start one - you can check out several items at once.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="aura-scroll flex-1 space-y-3 overflow-y-auto px-4 py-4">
                        {items.map((i) => (
                          <div key={i.productId} className="flex gap-3 rounded-xl border border-border bg-card p-2.5">
                            <ProductImage
                              src={i.imageUrl}
                              alt={i.name}
                              className="size-16 shrink-0 overflow-hidden rounded-lg"
                            />
                            <div className="flex min-w-0 flex-1 flex-col">
                              <p className="line-clamp-2 text-sm font-medium leading-snug text-card-foreground">{i.name}</p>
                              <span className="tnum mt-0.5 text-sm font-semibold text-card-foreground">
                                {formatMoney(i.price)}
                              </span>
                              <div className="mt-auto flex items-center justify-between pt-1.5">
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    aria-label="Decrease quantity"
                                    onClick={() => setQty(i.productId, i.quantity - 1)}
                                    className="grid size-6 place-items-center rounded-full border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                                  >
                                    <Minus className="size-3" />
                                  </button>
                                  <span className="tnum w-5 text-center text-sm">{i.quantity}</span>
                                  <button
                                    type="button"
                                    aria-label="Increase quantity"
                                    onClick={() => setQty(i.productId, i.quantity + 1)}
                                    className="grid size-6 place-items-center rounded-full border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                                  >
                                    <Plus className="size-3" />
                                  </button>
                                </div>
                                <button
                                  type="button"
                                  aria-label={`Remove ${i.name}`}
                                  onClick={() => remove(i.productId)}
                                  className="text-muted-foreground transition-colors hover:text-destructive"
                                >
                                  <Trash2 className="size-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={clear}
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-destructive"
                        >
                          <Trash2 className="size-3.5" /> Clear basket
                        </button>
                      </div>

                      <div className="border-t border-border/70 px-5 py-4">
                        <div className="mb-3 flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Subtotal</span>
                          <span className="tnum text-base font-semibold text-foreground">
                            {formatMoney({ amount: subtotal, currency })}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={checkout}
                          className="flex w-full items-center justify-center gap-2 rounded-full bg-gold px-5 py-3 text-sm font-semibold tracking-wide text-gold-foreground transition-all hover:brightness-105 active:translate-y-px"
                        >
                          Check out with Aura <ArrowRight className="size-4" />
                        </button>
                        <p className="mt-2 text-center text-[0.7rem] text-muted-foreground/80">
                          Aura confirms delivery, then hands you a secure click-to-pay link.
                        </p>
                      </div>
                    </>
                  )}
                </motion.aside>
              </>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}
