"use client";

import { motion } from "motion/react";
import { Package, MapPin, Camera, Video, CheckCircle2, Circle, Sparkles } from "lucide-react";
import type { OrderTracking } from "@/lib/kapruka";
import type { LoyaltyResult } from "@/lib/tools";
import { Badge } from "@/components/ui/badge";

const statusTone: Record<string, "gold" | "jade" | "rose" | "default"> = {
  delivered: "jade",
  shipped: "gold",
  "out-for-delivery": "gold",
  confirmed: "gold",
  received: "default",
  cancelled: "rose",
};

export function OrderTrackingCard({
  tracking,
  loyalty,
}: {
  tracking: OrderTracking;
  loyalty?: LoyaltyResult | null;
}) {
  const tone = statusTone[tracking.status] ?? "default";
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 240, damping: 22 }}
      className="max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
    >
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Package className="size-4 text-gold" />
          <span className="font-heading text-base text-card-foreground">
            {tracking.orderNumber}
          </span>
        </div>
        <Badge variant={tone}>{tracking.statusDisplay}</Badge>
      </div>

      {/* Verified-order → Aura Prestige credit (only on a newly counted order). */}
      {loyalty?.credited && (
        <div className="flex items-center gap-2 border-b border-border bg-gold/8 px-4 py-2 text-xs font-medium text-gold">
          <Sparkles className="size-3.5 shrink-0" />
          <span>
            {loyalty.leveledUp
              ? `Verified - welcome to Aura ${loyalty.tierName}! ✦`
              : `Verified - added to your Aura status (${loyalty.count} order${loyalty.count === 1 ? "" : "s"}).`}
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 px-4 py-3 text-sm">
        <div>
          <p className="text-[0.7rem] uppercase tracking-widest text-muted-foreground">Placed</p>
          <p className="mt-0.5 text-card-foreground">{tracking.orderDate}</p>
        </div>
        <div>
          <p className="text-[0.7rem] uppercase tracking-widest text-muted-foreground">Delivery</p>
          <p className="mt-0.5 text-card-foreground">{tracking.deliveryDate}</p>
        </div>
        <div className="col-span-2 flex items-start gap-1.5 text-muted-foreground">
          <MapPin className="mt-0.5 size-3.5 shrink-0" />
          <span>
            {tracking.recipient?.name} · {tracking.recipient?.address}, {tracking.recipient?.city}
          </span>
        </div>
      </div>

      {tracking.progress.length > 0 && (
        <ol className="space-y-0 border-t border-border px-4 py-3">
          {tracking.progress.map((p, i) => {
            const done = i < tracking.progress.length;
            const isLast = i === tracking.progress.length - 1;
            return (
              <li key={i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  {done ? (
                    <CheckCircle2 className="size-4 text-jade" />
                  ) : (
                    <Circle className="size-4 text-muted-foreground" />
                  )}
                  {!isLast && <span className="my-0.5 w-px flex-1 bg-border" />}
                </div>
                <div className="pb-3">
                  <p className="text-sm font-medium text-card-foreground">{p.step}</p>
                  <p className="text-xs text-muted-foreground">{p.timestamp}</p>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {(tracking.hasDeliveryPhoto || tracking.hasDeliveryVideo) && (
        <div className="flex gap-2 border-t border-border bg-muted/40 px-4 py-2.5 text-xs text-muted-foreground">
          {tracking.hasDeliveryPhoto && (
            <span className="inline-flex items-center gap-1">
              <Camera className="size-3.5" /> Delivery photo available
            </span>
          )}
          {tracking.hasDeliveryVideo && (
            <span className="inline-flex items-center gap-1">
              <Video className="size-3.5" /> Delivery video available
            </span>
          )}
        </div>
      )}
    </motion.div>
  );
}
