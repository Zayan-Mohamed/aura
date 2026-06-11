"use client";

import { motion } from "motion/react";
import { ChevronLeft, ChevronRight, MapPin, ShieldCheck, EyeOff } from "lucide-react";
import type { Product, DeliveryContext } from "@/lib/kapruka";
import { ProductCard } from "./product-card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  useCarousel,
} from "@/components/ui/carousel";

// The signature "Proactive Delivery Confidence" banner: confirms where/when
// and reassures the shopper that what's shown can actually arrive.
function DeliveryConfidenceBanner({ ctx }: { ctx: DeliveryContext }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl border border-jade/25 bg-jade/[0.06] px-3.5 py-2.5 text-sm"
    >
      <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
        <MapPin className="size-3.5 text-jade" />
        Sending to {ctx.city}
        {ctx.dateLabel ? <span className="text-muted-foreground">· {ctx.dateLabel}</span> : null}
      </span>
      <span className="inline-flex items-center gap-1.5 text-jade">
        <ShieldCheck className="size-3.5" />
        {ctx.deliverableCount} {ctx.deliverableCount === 1 ? "item reaches" : "reach"} you fresh
      </span>
      {ctx.hiddenCount > 0 && (
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <EyeOff className="size-3.5" />
          {ctx.hiddenCount} hidden — can’t arrive in time
        </span>
      )}
    </motion.div>
  );
}

function GalleryNav() {
  const { scrollPrev, scrollNext, canScrollPrev, canScrollNext } = useCarousel();
  return (
    <div className="hidden items-center gap-1.5 sm:flex">
      <button
        type="button"
        onClick={scrollPrev}
        disabled={!canScrollPrev}
        aria-label="Previous products"
        className="grid size-8 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
      >
        <ChevronLeft className="size-4" />
      </button>
      <button
        type="button"
        onClick={scrollNext}
        disabled={!canScrollNext}
        aria-label="Next products"
        className="grid size-8 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
      >
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}

export function ProductCarousel({
  products,
  title,
  deliveryContext,
  onAsk,
}: {
  products: Product[];
  title?: string;
  deliveryContext?: DeliveryContext;
  onAsk?: (text: string) => void;
}) {
  if (products.length === 0) return null;

  // A single result reads better as one anchored card than a lonely slide.
  if (products.length === 1) {
    return (
      <div className="max-w-[280px]">
        {deliveryContext && <DeliveryConfidenceBanner ctx={deliveryContext} />}
        <ProductCard product={products[0]} onAsk={onAsk} />
      </div>
    );
  }

  return (
    <Carousel opts={{ align: "start", dragFree: true, containScroll: "trimSnaps" }}>
      {deliveryContext && <DeliveryConfidenceBanner ctx={deliveryContext} />}
      <div className="mb-3 flex items-end justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {title ?? `${products.length} finds`}
          <span className="ml-2 hidden text-xs text-muted-foreground/70 sm:inline">
            swipe to explore →
          </span>
        </p>
        <GalleryNav />
      </div>
      <CarouselContent className="-ml-3">
        {products.map((product, i) => (
          <CarouselItem
            key={product.id || i}
            className="basis-[76%] pl-3 sm:basis-1/2 lg:basis-1/3 xl:basis-1/4"
          >
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.05, 0.3), duration: 0.35, ease: "easeOut" }}
              className="h-full"
            >
              <ProductCard product={product} onAsk={onAsk} className="h-full" />
            </motion.div>
          </CarouselItem>
        ))}
      </CarouselContent>
    </Carousel>
  );
}
