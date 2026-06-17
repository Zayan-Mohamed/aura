"use client";

import * as React from "react";
import { motion } from "motion/react";
import { Plus, Check, ArrowUpRight, Sparkles, Truck } from "lucide-react";
import type { Product } from "@/lib/kapruka";
import { formatMoney, discountPct } from "@/lib/format";
import { ProductImage } from "./product-image";
import { Badge } from "@/components/ui/badge";
import { basketStore } from "@/lib/use-basket";
import { cn } from "@/lib/utils";

function stockLabel(p: Product): string {
  if (!p.inStock) return "Out of stock";
  if (p.stockLevel === "low") return "Low stock";
  return "In stock";
}

function AddButton({ product }: { product: Product }) {
  const [added, setAdded] = React.useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        basketStore.add({
          productId: product.id,
          name: product.name,
          price: product.price,
          imageUrl: product.imageUrl,
          url: product.url,
        });
        setAdded(true);
        window.setTimeout(() => setAdded(false), 1400);
      }}
      aria-label={`Add ${product.name} to basket`}
      className={cn(
        // mt-auto pins the button to the bottom of the (equal-height) header cell
        // so all products' buttons align regardless of name length.
        "mt-auto flex w-full items-center justify-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-semibold tracking-wide transition-colors",
        added ? "bg-jade/15 text-jade" : "bg-gold text-gold-foreground hover:brightness-105",
      )}
    >
      {added ? <><Check className="size-3.5" /> Added</> : <><Plus className="size-3.5" /> Add</>}
    </button>
  );
}

/** A labelled spec row spanning every product column. */
function Row({ label, cells }: { label: string; cells: React.ReactNode[] }) {
  return (
    <>
      <div className="sticky left-0 z-10 flex items-center bg-card px-3 py-2.5 text-[0.7rem] font-medium uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      {cells}
    </>
  );
}

export function ComparisonCard({
  products,
  verdict,
  onAsk,
}: {
  products: Product[];
  verdict?: string;
  onAsk?: (text: string) => void;
}) {
  if (products.length < 2) return null;

  // "Best value" = lowest in-stock price (a cheap, honest highlight from real data).
  const priced = products.filter((p) => p.price.amount != null && p.inStock);
  const cheapestId =
    priced.length > 1
      ? priced.reduce((a, b) => ((a.price.amount ?? Infinity) <= (b.price.amount ?? Infinity) ? a : b)).id
      : null;

  // Fixed track widths - a `1fr` column inside a `min-w-max` grid has no upper
  // bound, so the square images balloon to fill the viewport. Fixed widths keep
  // each product a sane size and let the table scroll horizontally when needed.
  const cols = `6.5rem repeat(${products.length}, 10.5rem)`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 240, damping: 24 }}
      className="w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
    >
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Sparkles className="size-4 text-gold" />
        <span className="font-heading text-base text-card-foreground">
          Comparing {products.length}
        </span>
      </div>

      <div className="aura-scroll overflow-x-auto">
        <div className="grid min-w-max" style={{ gridTemplateColumns: cols }}>
          {/* Header: image + name + add */}
          <div className="sticky left-0 z-10 bg-card" />
          {products.map((p) => (
            <div key={p.id} className="flex h-full flex-col border-l border-border/60 p-3">
              <div className="relative">
                <ProductImage src={p.imageUrl} alt={p.name} className="aspect-square w-full rounded-lg" />
                {p.id === cheapestId && (
                  <Badge variant="jade" className="glass absolute left-1.5 top-1.5">
                    Best value
                  </Badge>
                )}
              </div>
              <p className="mb-2 mt-2 line-clamp-2 text-[0.8rem] font-semibold leading-snug text-card-foreground">
                {p.name}
              </p>
              <AddButton product={p} />
            </div>
          ))}

          {/* Spec rows */}
          <div className="contents [&>*]:border-t [&>*]:border-border/60">
            <Row
              label="Price"
              cells={products.map((p) => (
                <div key={p.id} className="border-l border-border/60 px-3 py-2.5">
                  <span className="tnum text-sm font-semibold text-card-foreground">
                    {formatMoney(p.price)}
                  </span>
                  {p.compareAtPrice?.amount && (
                    <span className="tnum ml-1.5 text-xs text-muted-foreground line-through">
                      {formatMoney(p.compareAtPrice)}
                    </span>
                  )}
                </div>
              ))}
            />
            <Row
              label="Savings"
              cells={products.map((p) => {
                const off = discountPct(p.price, p.compareAtPrice);
                return (
                  <div key={p.id} className="border-l border-border/60 px-3 py-2.5 text-sm">
                    {off != null ? <Badge variant="rose">−{off}%</Badge> : <span className="text-muted-foreground">-</span>}
                  </div>
                );
              })}
            />
            <Row
              label="Stock"
              cells={products.map((p) => (
                <div
                  key={p.id}
                  className={cn(
                    "border-l border-border/60 px-3 py-2.5 text-sm",
                    p.inStock ? "text-card-foreground" : "text-muted-foreground",
                  )}
                >
                  {stockLabel(p)}
                </div>
              ))}
            />
            <Row
              label="Delivery"
              cells={products.map((p) => (
                <div key={p.id} className="border-l border-border/60 px-3 py-2.5 text-sm text-card-foreground">
                  {p.delivery?.label ? (
                    <span className="inline-flex items-center gap-1">
                      <Truck className="size-3.5 text-jade" /> {p.delivery.label}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </div>
              ))}
            />
            <Row
              label="Category"
              cells={products.map((p) => (
                <div key={p.id} className="border-l border-border/60 px-3 py-2.5 text-sm text-muted-foreground">
                  {p.categoryName ?? "-"}
                </div>
              ))}
            />
            <Row
              label=""
              cells={products.map((p) => (
                <div key={p.id} className="border-l border-border/60 px-3 py-2.5">
                  <button
                    type="button"
                    onClick={() =>
                      onAsk?.(`Tell me more about "${p.name}" - what makes it stand out?`)
                    }
                    className="inline-flex items-center gap-1 text-xs font-medium text-gold hover:underline"
                  >
                    Details <ArrowUpRight className="size-3.5" />
                  </button>
                </div>
              ))}
            />
          </div>
        </div>
      </div>

      {verdict && (
        <div className="flex items-start gap-2 border-t border-border bg-gold/[0.05] px-4 py-3 text-sm text-card-foreground">
          <Sparkles className="mt-0.5 size-4 shrink-0 text-gold" />
          <span>{verdict}</span>
        </div>
      )}
    </motion.div>
  );
}
