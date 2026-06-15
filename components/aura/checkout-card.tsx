"use client";

import * as React from "react";
import { motion } from "motion/react";
import { ShieldCheck, Clock, ExternalLink, Receipt, Share2, Copy, Check } from "lucide-react";
import type { OrderConfirmation } from "@/lib/kapruka";
import { formatMoney, minutesUntil } from "@/lib/format";
import { shareText } from "@/lib/share";
import { cn } from "@/lib/utils";

function Countdown({ expiresAt }: { expiresAt: string }) {
  const [mins, setMins] = React.useState<number | null>(() => minutesUntil(expiresAt));
  React.useEffect(() => {
    const id = setInterval(() => setMins(minutesUntil(expiresAt)), 30_000);
    return () => clearInterval(id);
  }, [expiresAt]);

  if (mins == null) return null;
  const expired = mins <= 0;
  return (
    <span className={`inline-flex items-center gap-1 tnum ${expired ? "text-rose" : ""}`}>
      <Clock className="size-3.5" />
      {expired ? "Link expired" : `Pay within ${mins} min`}
    </span>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={strong ? "font-medium text-card-foreground" : "text-muted-foreground"}>
        {label}
      </span>
      <span className={`tnum ${strong ? "text-base font-semibold text-card-foreground" : ""}`}>
        {value}
      </span>
    </div>
  );
}

export function CheckoutCard({ order }: { order: OrderConfirmation }) {
  const { summary } = order;
  const cur = summary.currency;
  const [copied, setCopied] = React.useState(false);

  // The whole point of sharing: hand someone the actual click-to-pay link so
  // they can settle the bill (very common in SL — a relative pays for a gift).
  const shareMessage = `I've lined up an order on Kapruka via Aura.\nTotal: ${formatMoney({ amount: summary.grandTotal, currency: cur })}\nPay securely here (link expires soon): ${order.checkoutUrl}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(order.checkoutUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked — ignore */
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 240, damping: 22 }}
      className="max-w-md overflow-hidden rounded-2xl border border-gold/30 bg-card shadow-[0_24px_60px_-30px_rgb(0_0_0/0.5)]"
    >
      <div className="aura-radial flex items-center gap-2 border-b border-border px-4 py-3">
        <Receipt className="size-4 text-gold" />
        <span className="font-heading text-lg text-card-foreground">Your order is ready</span>
      </div>

      <div className="space-y-2 px-4 py-4 text-sm">
        <Row label="Items" value={formatMoney({ amount: summary.itemsTotal, currency: cur })} />
        <Row label="Delivery" value={formatMoney({ amount: summary.deliveryFee, currency: cur })} />
        {summary.addonsTotal > 0 && (
          <Row label="Add-ons" value={formatMoney({ amount: summary.addonsTotal, currency: cur })} />
        )}
        <div className="my-1 border-t border-dashed border-border" />
        <Row label="Total" value={formatMoney({ amount: summary.grandTotal, currency: cur })} strong />
      </div>

      <div className="px-4 pb-4">
        <a
          href={order.checkoutUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center gap-2 rounded-full bg-gold px-5 py-3 text-sm font-semibold tracking-wide text-gold-foreground shadow-sm transition-all hover:brightness-105 active:translate-y-px"
        >
          Pay securely on Kapruka
          <ExternalLink className="size-4" />
        </a>

        {/* Forward the actual click-to-pay link to whoever's settling the bill. */}
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => void shareText(shareMessage, "Aura order")}
            className="flex items-center justify-center gap-1.5 rounded-full border border-border px-3 py-2.5 text-xs font-semibold tracking-wide text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Share2 className="size-3.5" /> Share pay link
          </button>
          <button
            type="button"
            onClick={copyLink}
            aria-label="Copy payment link"
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-full border px-3 py-2.5 text-xs font-semibold tracking-wide transition-colors",
              copied
                ? "border-jade/40 bg-jade/10 text-jade"
                : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {copied ? <><Check className="size-3.5" /> Copied</> : <><Copy className="size-3.5" /> Copy link</>}
          </button>
        </div>
        <p className="mt-1.5 text-center text-[0.7rem] text-muted-foreground/80">
          Send the link to whoever&rsquo;s paying — they can settle it without an account.
        </p>

        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <ShieldCheck className="size-3.5 text-jade" />
            {order.orderRef}
          </span>
          <Countdown expiresAt={order.expiresAt} />
        </div>
        <p className="mt-2 text-center text-[0.7rem] text-muted-foreground/80">
          No account needed · price locked for the life of this link
        </p>
      </div>
    </motion.div>
  );
}
