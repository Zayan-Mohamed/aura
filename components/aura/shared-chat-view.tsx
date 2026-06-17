"use client";

import * as React from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ShoppingBag,
  X,
  Minus,
  Plus,
  Trash2,
  ArrowRight,
  Loader2,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import type { AuraUIMessage } from "@/lib/ai-types";
import type { OrderConfirmation } from "@/lib/kapruka";
import { useBasket } from "@/lib/use-basket";
import { formatMoney } from "@/lib/format";
import { AuraMark } from "./aura-mark";
import { ChatMessage } from "./message";
import { CheckoutCard } from "./checkout-card";
import { ProductImage } from "./product-image";

/** Today (Asia/Colombo) as YYYY-MM-DD - the earliest selectable delivery date. */
function todayColombo(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Colombo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function Field({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1 block text-[0.7rem] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <input
        {...props}
        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-gold/50"
      />
    </label>
  );
}

/** Right-side drawer: basket review → delivery form → secure pay link. */
function CheckoutDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const reduce = useReducedMotion();
  const { items, setQty, remove } = useBasket();
  const [status, setStatus] = React.useState<"idle" | "loading" | "done" | "error">("idle");
  const [result, setResult] = React.useState<OrderConfirmation | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({
    senderName: "",
    recipientName: "",
    recipientPhone: "",
    address: "",
    city: "",
    date: "",
  });

  const currency = items.find((i) => i.price.amount != null)?.price.currency ?? "LKR";
  const subtotal = items.reduce((sum, i) => sum + (i.price.amount ?? 0) * i.quantity, 0);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const ready =
    items.length > 0 &&
    form.senderName.trim() &&
    form.recipientName.trim() &&
    form.recipientPhone.trim() &&
    form.address.trim() &&
    form.city.trim() &&
    form.date;

  const submit = async () => {
    if (!ready) return;
    setStatus("loading");
    setError(null);
    try {
      const res = await fetch("/api/share-checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
          sender: { name: form.senderName },
          recipient: { name: form.recipientName, phone: form.recipientPhone },
          delivery: { address: form.address, city: form.city, date: form.date },
        }),
      });
      const data = (await res.json()) as { order?: OrderConfirmation; error?: string };
      if (!res.ok || !data.order) {
        setStatus("error");
        setError(data.error || "Couldn't create the payment link. Please check the details.");
        return;
      }
      setResult(data.order);
      setStatus("done");
    } catch {
      setStatus("error");
      setError("Network hiccup - please try again.");
    }
  };

  return (
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
            role="dialog"
            aria-modal="true"
            aria-label="Checkout"
            initial={reduce ? { opacity: 0 } : { x: "100%" }}
            animate={reduce ? { opacity: 1 } : { x: 0 }}
            exit={reduce ? { opacity: 0 } : { x: "100%" }}
            transition={reduce ? { duration: 0.15 } : { type: "spring", stiffness: 380, damping: 38 }}
            className="glass fixed inset-y-0 right-0 z-50 flex w-[90%] max-w-md flex-col border-l border-border bg-background/95 shadow-2xl"
          >
            <div className="flex items-center justify-between gap-3 border-b border-border/70 px-5 py-4">
              <p className="font-heading text-lg text-foreground">
                {status === "done" ? "Your order is ready" : "Check out"}
              </p>
              <button
                type="button"
                aria-label="Close"
                onClick={onClose}
                className="grid size-8 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="aura-scroll flex-1 overflow-y-auto px-5 py-4">
              {status === "done" && result ? (
                <CheckoutCard order={result} />
              ) : (
                <>
                  {/* Basket */}
                  <div className="space-y-2.5">
                    {items.map((i) => (
                      <div key={i.productId} className="flex gap-3 rounded-xl border border-border bg-card p-2.5">
                        <ProductImage
                          src={i.imageUrl}
                          alt={i.name}
                          className="size-14 shrink-0 overflow-hidden rounded-lg"
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
                    {items.length === 0 && (
                      <p className="py-6 text-center text-sm text-muted-foreground">
                        Add a product from the chat to start your basket.
                      </p>
                    )}
                  </div>

                  {/* Delivery form */}
                  {items.length > 0 && (
                    <div className="mt-5 space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span className="tnum text-base font-semibold text-foreground">
                          {formatMoney({ amount: subtotal, currency })}
                        </span>
                      </div>
                      <Field label="Your name" value={form.senderName} onChange={set("senderName")} placeholder="Sender name" />
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Recipient" value={form.recipientName} onChange={set("recipientName")} placeholder="Who receives it" />
                        <Field label="Phone" value={form.recipientPhone} onChange={set("recipientPhone")} placeholder="07X XXX XXXX" inputMode="tel" />
                      </div>
                      <Field label="Address" value={form.address} onChange={set("address")} placeholder="Delivery address" />
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="City" value={form.city} onChange={set("city")} placeholder="e.g. Colombo 03" />
                        <Field label="Delivery date" type="date" min={todayColombo()} value={form.date} onChange={set("date")} />
                      </div>

                      {status === "error" && error && (
                        <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3.5 py-2.5 text-sm text-destructive">
                          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                          <span>{error}</span>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={submit}
                        disabled={!ready || status === "loading"}
                        className="flex w-full items-center justify-center gap-2 rounded-full bg-gold px-5 py-3 text-sm font-semibold tracking-wide text-gold-foreground transition-all hover:brightness-105 active:translate-y-px disabled:opacity-50"
                      >
                        {status === "loading" ? (
                          <>
                            <Loader2 className="size-4 animate-spin" /> Generating pay link…
                          </>
                        ) : (
                          <>
                            Generate secure pay link <ArrowRight className="size-4" />
                          </>
                        )}
                      </button>
                      <p className="text-center text-[0.7rem] text-muted-foreground/80">
                        A real 60-minute Kapruka click-to-pay link · no account needed
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

/**
 * Read-only view of a shared chat: the frozen transcript (with its product
 * cards), plus a basket + checkout form so the recipient can buy what they see.
 * No AI chat - viewing, basket and checkout only.
 */
export function SharedChatView({ title, messages }: { title: string; messages: AuraUIMessage[] }) {
  const { count } = useBasket();
  const [checkoutOpen, setCheckoutOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  React.useEffect(() => setMounted(true), []);

  return (
    <div className="relative flex min-h-dvh flex-col">
      <header className="glass sticky top-0 z-30 border-b border-border/70">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-2 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-card ring-1 ring-border">
              <AuraMark className="size-5" />
            </div>
            <div className="min-w-0 leading-none">
              <p className="font-heading text-lg text-foreground">Aura</p>
              <p className="truncate text-[0.7rem] tracking-wide text-muted-foreground">Shared with you</p>
            </div>
          </div>
          <Link
            href="/"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Sparkles className="size-3.5 text-gold" /> Start your own
          </Link>
        </div>
      </header>

      <main className="aura-scroll relative w-full flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-5 pb-32 pt-6 sm:px-6">
          <div className="mb-6 rounded-2xl border border-border bg-card/60 px-4 py-3 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{title}</span> - someone shared this Aura chat
            with you. Browse the picks, add what you like to your basket, and check out securely.
          </div>
          <div className="flex flex-col gap-6">
            {messages.map((m) => (
              <ChatMessage key={m.id} message={m} />
            ))}
          </div>
        </div>
      </main>

      {/* Sticky checkout bar */}
      {mounted && count > 0 && !checkoutOpen && (
        <div className="fixed inset-x-0 bottom-0 z-30">
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-background via-background/85 to-transparent" />
          <div className="relative mx-auto w-full max-w-3xl px-5 pb-5 pt-2 sm:px-6">
            <button
              type="button"
              onClick={() => setCheckoutOpen(true)}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-gold px-5 py-3.5 text-sm font-semibold tracking-wide text-gold-foreground shadow-lg transition-all hover:brightness-105 active:translate-y-px"
            >
              <ShoppingBag className="size-4" />
              Check out {count} item{count === 1 ? "" : "s"} <ArrowRight className="size-4" />
            </button>
          </div>
        </div>
      )}

      {mounted && createPortal(<CheckoutDrawer open={checkoutOpen} onClose={() => setCheckoutOpen(false)} />, document.body)}
    </div>
  );
}
