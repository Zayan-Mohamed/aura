"use client";

import * as React from "react";
import { motion } from "motion/react";
import { ArrowUpRight, BadgeCheck, Truck, Plus, Check, Sparkles } from "lucide-react";
import type { Product, DeliveryStatus } from "@/lib/kapruka";
import { formatMoney, discountPct } from "@/lib/format";
import { ProductImage } from "./product-image";
import { Badge } from "@/components/ui/badge";
import { basketStore } from "@/lib/use-basket";
import { cn } from "@/lib/utils";

// Delivery verdict → badge styling. `fresh`/`deliverable` reassure (jade);
// `outstation` cautions (gold). `unavailable` items are filtered out upstream.
const deliveryBadge: Record<
  DeliveryStatus,
  { variant: "jade" | "gold"; icon: React.ElementType }
> = {
  fresh: { variant: "jade", icon: BadgeCheck },
  deliverable: { variant: "jade", icon: Truck },
  outstation: { variant: "gold", icon: Truck },
  unavailable: { variant: "gold", icon: Truck },
};

export function ProductCard({
  product,
  onAsk,
  className,
}: {
  product: Product;
  onAsk?: (text: string) => void;
  className?: string;
}) {
  const off = discountPct(product.price, product.compareAtPrice);
  const lowStock = product.stockLevel === "low" && product.inStock;
  const [added, setAdded] = React.useState(false);

  const addToBasket = () => {
    basketStore.add({
      productId: product.id,
      name: product.name,
      price: product.price,
      imageUrl: product.imageUrl,
      url: product.url,
    });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1400);
  };

  const details = () =>
    onAsk?.(
      `Tell me more about "${product.name}" — what it is, what makes it special, and who it's a good fit for.`,
    );

  return (
    <motion.article
      layout
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 320, damping: 26 }}
      className={cn(
        "group/card flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm",
        "transition-shadow hover:shadow-[0_18px_40px_-22px_rgb(0_0_0/0.35)]",
        className,
      )}
    >
      <button type="button" onClick={details} className="relative block text-left" aria-label={`Details for ${product.name}`}>
        <ProductImage
          src={product.imageUrl}
          alt={product.name}
          className="aspect-square w-full"
          imgClassName="group-hover/card:scale-[1.04]"
        />
        <div className="absolute left-2.5 top-2.5 flex flex-col gap-1.5">
          {off != null && <Badge variant="rose">−{off}%</Badge>}
        </div>
        {lowStock && (
          <Badge variant="outline" className="glass absolute right-2.5 top-2.5">
            <span className="size-1.5 rounded-full bg-rose" /> Low stock
          </Badge>
        )}
        {product.delivery && product.delivery.status !== "unavailable" && (
          <Badge
            variant={deliveryBadge[product.delivery.status].variant}
            className="glass absolute bottom-2.5 left-2.5"
            title={product.delivery.note}
          >
            {(() => {
              const Icon = deliveryBadge[product.delivery.status].icon;
              return <Icon className="size-3" />;
            })()}
            {product.delivery.label}
          </Badge>
        )}
      </button>

      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <button
          type="button"
          onClick={details}
          className="line-clamp-2 text-left text-[0.9rem] font-semibold leading-snug text-card-foreground hover:text-gold"
        >
          {product.name}
        </button>

        <div className="mt-auto flex items-baseline gap-2 pt-1">
          <span className="tnum text-base font-semibold text-card-foreground">
            {formatMoney(product.price)}
          </span>
          {product.compareAtPrice?.amount && (
            <span className="tnum text-xs text-muted-foreground line-through">
              {formatMoney(product.compareAtPrice)}
            </span>
          )}
        </div>

        <div className="mt-2 flex flex-col gap-2">
          <button
            type="button"
            onClick={addToBasket}
            aria-label={`Add ${product.name} to basket`}
            className={cn(
              "flex w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3 py-2 text-xs font-semibold tracking-wide transition-colors",
              added
                ? "bg-jade/15 text-jade"
                : "bg-gold text-gold-foreground hover:brightness-105",
            )}
          >
            {added ? (
              <>
                <Check className="size-3.5" /> Added
              </>
            ) : (
              <>
                <Plus className="size-3.5" /> Add to basket
              </>
            )}
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={details}
              aria-label={`Tell me more about ${product.name}`}
              className="flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-border px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Sparkles className="size-3.5" /> Tell me more
            </button>
            <a
              href={product.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open ${product.name} on Kapruka`}
              className="grid size-9 shrink-0 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ArrowUpRight className="size-4" />
            </a>
          </div>
        </div>
      </div>
    </motion.article>
  );
}
