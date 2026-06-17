"use client";

import { motion } from "motion/react";
import {
  Loader2,
  Search,
  PackageSearch,
  LayoutGrid,
  MapPin,
  Truck,
  Receipt,
  PackageCheck,
  SearchX,
  AlertTriangle,
  Sparkles,
  Scale,
  Gift,
  MessageCircleQuestion,
} from "lucide-react";
import { ProductCarousel } from "./product-carousel";
import { ProductDetail } from "./product-detail";
import { ComparisonCard } from "./comparison-card";
import { CategoryGrid } from "./category-grid";
import { DeliveryCard } from "./delivery-result";
import { CheckoutCard } from "./checkout-card";
import { OrderTrackingCard } from "./order-tracking";
import { PlanGiftCard } from "./plan-gift-card";
import { ChoicePrompt } from "./choice-prompt";

/* eslint-disable @typescript-eslint/no-explicit-any */
type ToolPartLike = {
  type: string;
  state: "input-streaming" | "input-available" | "output-available" | "output-error";
  input?: any;
  output?: any;
  errorText?: string;
};
/* eslint-enable @typescript-eslint/no-explicit-any */

const LABELS: Record<string, { icon: React.ElementType; verb: string }> = {
  "tool-searchProducts": { icon: Search, verb: "Searching Kapruka" },
  "tool-getProduct": { icon: PackageSearch, verb: "Fetching the details" },
  "tool-listCategories": { icon: LayoutGrid, verb: "Gathering categories" },
  "tool-listDeliveryCities": { icon: MapPin, verb: "Looking up cities" },
  "tool-checkDelivery": { icon: Truck, verb: "Checking delivery" },
  "tool-createOrder": { icon: Receipt, verb: "Preparing your secure checkout" },
  "tool-trackOrder": { icon: PackageCheck, verb: "Tracking your order" },
  "tool-visualSearch": { icon: Sparkles, verb: "Matching your photo" },
  "tool-compareProducts": { icon: Scale, verb: "Lining them up" },
  "tool-planGift": { icon: Gift, verb: "Planning the perfect gift" },
  "tool-askChoice": { icon: MessageCircleQuestion, verb: "One quick question" },
};

function ToolStatus({ type, query }: { type: string; query?: string }) {
  const meta = LABELS[type] ?? { icon: Loader2, verb: "Working" };
  const Icon = meta.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3.5 py-2 text-sm text-muted-foreground"
    >
      <Icon className="size-4 text-gold" />
      <span>
        {meta.verb}
        {query ? <span className="text-foreground"> · “{query}”</span> : null}
      </span>
      <Loader2 className="size-3.5 animate-spin text-gold" />
    </motion.div>
  );
}

function Notice({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="inline-flex items-start gap-2 rounded-xl border border-border bg-muted/50 px-3.5 py-2.5 text-sm text-muted-foreground">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <span>{children}</span>
    </div>
  );
}

export function ToolPart({
  part,
  onAsk,
}: {
  part: ToolPartLike;
  onAsk?: (text: string) => void;
}) {
  const { type, state } = part;

  if (state === "input-streaming" || state === "input-available") {
    return <ToolStatus type={type} query={part.input?.q} />;
  }

  if (state === "output-error") {
    return (
      <Notice icon={AlertTriangle}>
        {part.errorText || "That didn't go through. Want me to try again?"}
      </Notice>
    );
  }

  const out = part.output ?? {};
  // Every fetcher degrades to { error } — surface it warmly.
  if (out.error) return <Notice icon={AlertTriangle}>{out.error}</Notice>;

  switch (type) {
    case "tool-searchProducts": {
      const products = out.products ?? [];
      const ctx = out.deliveryContext;
      if (products.length === 0) {
        // Delivery-aware search where everything was filtered out as undeliverable.
        if (ctx && ctx.hiddenCount > 0) {
          return (
            <Notice icon={Truck}>
              Nothing for “{out.query}” can reach {ctx.city}
              {ctx.dateLabel ? ` by ${ctx.dateLabel}` : ""} in time
              {ctx.nextAvailableDate ? ` (next available ${ctx.nextAvailableDate})` : ""}. Want me
              to look at a later date, or items that travel better?
            </Notice>
          );
        }
        return (
          <Notice icon={SearchX}>
            I couldn’t find anything for “{out.query}”. Want me to try a different style, or
            browse a category?
          </Notice>
        );
      }
      return (
        <ProductCarousel
          products={products}
          deliveryContext={ctx}
          rationale={out.rationale}
          onAsk={onAsk}
        />
      );
    }
    case "tool-getProduct":
      return out.product ? <ProductDetail product={out.product} onAsk={onAsk} /> : null;
    case "tool-compareProducts": {
      const products = out.products ?? [];
      if (products.length < 2) {
        return <Notice icon={Scale}>I need at least two products to compare. Want me to search again?</Notice>;
      }
      return <ComparisonCard products={products} verdict={out.verdict} onAsk={onAsk} />;
    }
    case "tool-listCategories":
      return <CategoryGrid categories={out.categories ?? []} onAsk={onAsk} />;
    case "tool-listDeliveryCities": {
      const cities = out.cities ?? [];
      if (cities.length === 0) return <Notice icon={MapPin}>No matching delivery cities.</Notice>;
      return (
        <div className="flex max-w-md flex-wrap gap-2">
          {cities.map((c: { name: string }) => (
            <button
              key={c.name}
              type="button"
              onClick={() => onAsk?.(`Check delivery to ${c.name}.`)}
              className="rounded-full border border-border bg-card px-3 py-1.5 text-sm text-card-foreground transition-colors hover:border-gold/40 hover:bg-gold/5"
            >
              {c.name}
            </button>
          ))}
        </div>
      );
    }
    case "tool-checkDelivery":
      return out.city ? <DeliveryCard result={out} /> : null;
    case "tool-createOrder":
      return out.checkoutUrl ? <CheckoutCard order={out} /> : null;
    case "tool-trackOrder":
      return out.orderNumber ? <OrderTrackingCard tracking={out} loyalty={out.loyalty} /> : null;
    case "tool-askChoice":
      return Array.isArray(out.options) && out.options.length > 0 ? (
        <ChoicePrompt data={out} onAsk={onAsk} />
      ) : null;
    case "tool-planGift":
      return out.proposal ? (
        <PlanGiftCard
          proposal={out.proposal}
          deliveryContext={out.deliveryContext}
          onAsk={onAsk}
        />
      ) : (
        <Notice icon={Gift}>
          I couldn&rsquo;t put a gift together in that budget. Want me to widen it or move the
          date?
        </Notice>
      );
    case "tool-visualSearch": {
      const products = out.products ?? [];
      if (products.length === 0) {
        return (
          <Notice icon={SearchX}>
            I couldn’t find a visual match for that photo. Want to describe it in words instead?
          </Notice>
        );
      }
      const verdict = out.verdict as string;
      const title =
        verdict === "exact"
          ? "Found your match"
          : verdict === "similar"
            ? "Closest visual matches"
            : "Visually similar finds";
      const pct = Math.round((out.topScore ?? 0) * 100);
      return (
        <div className="flex flex-col gap-2">
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-gold/30 bg-gold/[0.06] px-3 py-1 text-xs font-medium text-foreground">
            <Sparkles className="size-3.5 text-gold" />
            {title}
            {pct ? <span className="text-muted-foreground">· {pct}% match</span> : null}
          </span>
          <ProductCarousel
            products={products}
            deliveryContext={out.deliveryContext}
            rationale={out.rationale}
            title={out.caption ? `Closest to your “${out.caption}”` : undefined}
            onAsk={onAsk}
          />
        </div>
      );
    }
    default:
      return null;
  }
}
