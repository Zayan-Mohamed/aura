"use client";

import { motion } from "motion/react";
import { ChevronLeft, ChevronRight, MapPin, ShieldCheck, EyeOff, Sparkles } from "lucide-react";
import type { Product, DeliveryContext } from "@/lib/kapruka";
import { ProductCard } from "./product-card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  useCarousel,
} from "@/components/ui/carousel";

// The concierge "why these" line - the model's one-sentence reasoning for this
// selection, turning a carousel into a recommendation.
function RationaleLine({ text }: { text: string }) {
  return (
    <motion.p
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-3 flex items-start gap-1.5 text-sm text-muted-foreground"
    >
      <Sparkles className="mt-0.5 size-3.5 shrink-0 text-gold" />
      <span className="text-card-foreground/90">{text}</span>
    </motion.p>
  );
}

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
          {ctx.hiddenCount} hidden - can’t arrive in time
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
  rationale,
  onAsk,
}: {
  products: Product[];
  title?: string;
  deliveryContext?: DeliveryContext;
  rationale?: string;
  onAsk?: (text: string) => void;
}) {
  if (products.length === 0) return null;

  // A single result reads better as one anchored card than a lonely slide.
  if (products.length === 1) {
    return (
      <div className="w-full max-w-[280px]">
        {deliveryContext && <DeliveryConfidenceBanner ctx={deliveryContext} />}
        {rationale && <RationaleLine text={rationale} />}
        <ProductCard product={products[0]} onAsk={onAsk} />
      </div>
    );
  }

  return (
    <Carousel
      className="w-full min-w-0"
      opts={{ align: "start", dragFree: true, containScroll: "trimSnaps" }}
    >
      {deliveryContext && <DeliveryConfidenceBanner ctx={deliveryContext} />}
      {rationale && <RationaleLine text={rationale} />}
      <div className="mb-3 flex items-end justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {title ?? `${products.length} finds`}
          <span className="ml-2 hidden text-xs text-muted-foreground/70 sm:inline">
            swipe to explore →
          </span>
        </p>
        <GalleryNav />
      </div>
      {/* Gap-based spacing (ml-0 neutralises the primitive's negative margin):
          the negative-margin + pl trick miscomputes Embla's right scroll bound
          under containScroll, which left the last card clipped/unreachable. The
          calc() bases keep whole cards per breakpoint after the gap is removed. */}
      <CarouselContent className="ml-0 gap-3">
        {products.map((product, i) => (
          <CarouselItem
            key={product.id || i}
            className="basis-[82%] pl-0 sm:basis-[calc(50%-0.375rem)] lg:basis-[calc(33.333%-0.5rem)]"
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
