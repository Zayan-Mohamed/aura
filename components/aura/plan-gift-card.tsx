"use client";

import { motion } from "motion/react";
import { Sparkles, Gift, MapPin, CalendarDays, Wallet, ArrowRight } from "lucide-react";
import type { Product, DeliveryContext } from "@/lib/kapruka";
import { formatMoney } from "@/lib/format";
import { ProductImage } from "./product-image";

/** The curated proposal shape returned by the `planGift` tool (Diamond+). */
export type GiftProposal = {
  product: Product;
  alternates?: Product[];
  occasion: string;
  date: string;
  city: string;
  recipientName?: string | null;
  budgetLKR: number;
  rationale?: string;
};

function Meta({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <Icon className="size-3.5 text-gold" />
      {children}
    </span>
  );
}

/**
 * Autonomous Concierge result: Aura's single best in-budget, deliverable pick for
 * the occasion. The shopper confirms in one tap, which hands the conversation back
 * to the model to gather any remaining delivery details and run the normal
 * createOrder checkout - so this card never touches money or fakes a fee.
 *
 * Presentational + props-driven (no local state) to satisfy the repo's React
 * Compiler lint rules.
 */
export function PlanGiftCard({
  proposal,
  onAsk,
}: {
  proposal: GiftProposal;
  deliveryContext?: DeliveryContext;
  onAsk?: (text: string) => void;
}) {
  const { product, alternates, occasion, date, city, recipientName, budgetLKR, rationale } =
    proposal;
  const forWhom = recipientName?.trim() || "the recipient";

  const confirm = () =>
    onAsk?.(
      `Perfect - let's go with "${product.name}" (${product.id}) for ${occasion}, delivering to ${forWhom} in ${city} on ${date}. Take me to checkout: ask me for anything you still need (recipient phone, exact address, sender name), then create the order.`,
    );

  const swap = (alt: Product) =>
    onAsk?.(
      `Actually, let's go with "${alt.name}" (${alt.id}) instead for ${occasion} - same delivery to ${forWhom} in ${city} on ${date}. Take me to checkout.`,
    );

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 240, damping: 22 }}
      className="max-w-md overflow-hidden rounded-2xl border border-gold/30 bg-card shadow-[0_24px_60px_-30px_rgb(0_0_0/0.5)]"
    >
      <div className="aura-radial flex items-center gap-2 border-b border-border px-4 py-3">
        <Sparkles className="size-4 text-gold" />
        <span className="font-heading text-lg text-card-foreground">
          Aura&rsquo;s pick for {occasion}
        </span>
      </div>

      <div className="flex gap-3 p-4">
        <ProductImage
          src={product.imageUrl}
          alt={product.name}
          className="size-24 shrink-0 overflow-hidden rounded-xl"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="line-clamp-2 text-sm font-semibold leading-snug text-card-foreground">
            {product.name}
          </p>
          <span className="tnum text-base font-semibold text-card-foreground">
            {formatMoney(product.price)}
          </span>
          {product.delivery?.label && (
            <Meta icon={MapPin}>{product.delivery.label}</Meta>
          )}
        </div>
      </div>

      {rationale && (
        <p className="px-4 pb-1 text-sm leading-relaxed text-muted-foreground">
          <Gift className="mr-1 inline size-3.5 text-gold" />
          {rationale}
        </p>
      )}

      <div className="flex flex-wrap gap-x-4 gap-y-1.5 px-4 py-2">
        <Meta icon={CalendarDays}>{date}</Meta>
        <Meta icon={MapPin}>{city}</Meta>
        <Meta icon={Wallet}>
          Budget {formatMoney({ amount: budgetLKR, currency: product.price?.currency ?? "LKR" })}
        </Meta>
      </div>

      <div className="px-4 pb-4 pt-1">
        <button
          type="button"
          onClick={confirm}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-gold px-5 py-3 text-sm font-semibold tracking-wide text-gold-foreground shadow-sm transition-all hover:brightness-105 active:translate-y-px"
        >
          Confirm &amp; check out
          <ArrowRight className="size-4" />
        </button>

        {alternates && alternates.length > 0 && (
          <div className="mt-3">
            <p className="mb-1.5 text-[0.7rem] font-medium uppercase tracking-wide text-muted-foreground/80">
              Or swap for
            </p>
            <div className="flex flex-wrap gap-2">
              {alternates.map((alt) => (
                <button
                  key={alt.id}
                  type="button"
                  onClick={() => swap(alt)}
                  className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-card-foreground transition-colors hover:border-gold/40 hover:bg-gold/5"
                >
                  <span className="line-clamp-1 max-w-[10rem]">{alt.name}</span>
                  <span className="tnum text-muted-foreground">{formatMoney(alt.price)}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
