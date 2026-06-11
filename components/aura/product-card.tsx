"use client";

import { motion } from "motion/react";
import { ArrowUpRight, Sparkles, BadgeCheck, Truck } from "lucide-react";
import type { Product, DeliveryStatus } from "@/lib/kapruka";
import { formatMoney, discountPct } from "@/lib/format";
import { ProductImage } from "./product-image";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const stockTone: Record<string, string> = {
  low: "text-rose",
  medium: "text-gold",
  high: "text-jade",
};

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
      <div className="relative">
        <ProductImage
          src={product.imageUrl}
          alt={product.name}
          className="aspect-[4/5] w-full"
          imgClassName="group-hover/card:scale-[1.04]"
        />
        <div className="absolute left-3 top-3 flex flex-col gap-1.5">
          {off != null && <Badge variant="rose">−{off}%</Badge>}
          {product.stockLevel && (
            <Badge variant="outline" className="glass capitalize">
              <span className={cn("size-1.5 rounded-full bg-current", stockTone[product.stockLevel])} />
              {product.inStock ? `${product.stockLevel} stock` : "Out of stock"}
            </Badge>
          )}
        </div>
        {product.shipsInternationally && (
          <Badge variant="gold" className="glass absolute right-3 top-3">
            <Sparkles className="size-3" /> Ships worldwide
          </Badge>
        )}
        {product.delivery && product.delivery.status !== "unavailable" && (
          <Badge
            variant={deliveryBadge[product.delivery.status].variant}
            className="glass absolute bottom-3 left-3"
            title={product.delivery.note}
          >
            {(() => {
              const Icon = deliveryBadge[product.delivery.status].icon;
              return <Icon className="size-3" />;
            })()}
            {product.delivery.label}
          </Badge>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-2 text-[0.95rem] font-semibold leading-snug text-card-foreground">
          {product.name}
        </h3>
        {product.categoryName && (
          <span className="text-[0.7rem] uppercase tracking-widest text-muted-foreground">
            {product.categoryName}
          </span>
        )}

        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <div className="flex flex-col">
            <span className="tnum text-lg font-semibold text-card-foreground">
              {formatMoney(product.price)}
            </span>
            {product.compareAtPrice?.amount && (
              <span className="tnum text-xs text-muted-foreground line-through">
                {formatMoney(product.compareAtPrice)}
              </span>
            )}
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => onAsk?.(`Tell me more about "${product.name}".`)}
            className="flex-1 rounded-full bg-foreground px-3 py-2 text-xs font-semibold tracking-wide text-background transition-colors hover:bg-foreground/85"
          >
            Tell me more
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
    </motion.article>
  );
}
