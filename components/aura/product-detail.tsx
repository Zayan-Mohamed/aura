"use client";

import * as React from "react";
import { motion } from "motion/react";
import { ArrowUpRight, Truck } from "lucide-react";
import type { Product } from "@/lib/kapruka";
import { formatMoney, discountPct } from "@/lib/format";
import { ProductImage } from "./product-image";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function ProductDetail({
  product,
  onAsk,
}: {
  product: Product;
  onAsk?: (text: string) => void;
}) {
  const images = product.images?.length ? product.images : product.imageUrl ? [product.imageUrl] : [];
  const [active, setActive] = React.useState(0);
  const off = discountPct(product.price, product.compareAtPrice);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 240, damping: 24 }}
      className="grid max-w-xl gap-4 overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm sm:grid-cols-[minmax(0,200px)_1fr]"
    >
      <div className="flex flex-col gap-2">
        <ProductImage
          src={images[active]}
          alt={product.name}
          className="aspect-square w-full rounded-xl"
        />
        {images.length > 1 && (
          <div className="flex gap-2">
            {images.slice(0, 4).map((src, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setActive(i)}
                aria-label={`View image ${i + 1}`}
                className={cn(
                  "size-12 overflow-hidden rounded-lg border transition-all",
                  active === i ? "border-gold ring-2 ring-gold/30" : "border-border opacity-70 hover:opacity-100",
                )}
              >
                <ProductImage src={src} alt="" className="size-full" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col">
        <div className="flex flex-wrap items-center gap-1.5">
          {product.categoryName && (
            <span className="text-[0.7rem] uppercase tracking-widest text-muted-foreground">
              {product.categoryName}
            </span>
          )}
          {off != null && <Badge variant="rose">−{off}%</Badge>}
        </div>
        <h3 className="mt-1 font-heading text-xl leading-tight text-card-foreground">
          {product.name}
        </h3>

        <div className="mt-2 flex items-end gap-2">
          <span className="tnum text-2xl font-semibold text-card-foreground">
            {formatMoney(product.price)}
          </span>
          {product.compareAtPrice?.amount && (
            <span className="tnum mb-1 text-sm text-muted-foreground line-through">
              {formatMoney(product.compareAtPrice)}
            </span>
          )}
        </div>

        {product.description && (
          <p className="mt-2 line-clamp-4 text-sm leading-relaxed text-muted-foreground">
            {product.description}
          </p>
        )}

        <div className="mt-auto flex flex-wrap gap-2 pt-4">
          <button
            type="button"
            onClick={() => onAsk?.(`Can you deliver "${product.name}" — let me check my city?`)}
            className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-xs font-semibold tracking-wide text-background transition-colors hover:bg-foreground/85"
          >
            <Truck className="size-3.5" /> Check delivery
          </button>
          <a
            href={product.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs font-semibold tracking-wide text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            View on Kapruka <ArrowUpRight className="size-3.5" />
          </a>
        </div>
      </div>
    </motion.div>
  );
}
