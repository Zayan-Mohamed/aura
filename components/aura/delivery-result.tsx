"use client";

import { motion } from "motion/react";
import { CheckCircle2, CalendarClock, Truck, AlertTriangle, MapPin } from "lucide-react";
import type { DeliveryResult } from "@/lib/kapruka";
import { formatMoney } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

export function DeliveryCard({ result }: { result: DeliveryResult }) {
  const ok = result.available;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
      className="max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
    >
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <span
          className={`grid size-9 place-items-center rounded-full ${
            ok ? "bg-jade/14 text-jade" : "bg-rose/14 text-rose"
          }`}
        >
          {ok ? <Truck className="size-4.5" /> : <CalendarClock className="size-4.5" />}
        </span>
        <div className="flex flex-1 items-center gap-1.5">
          <MapPin className="size-3.5 text-muted-foreground" />
          <span className="font-heading text-lg leading-none text-card-foreground">
            {result.city}
          </span>
        </div>
        <Badge variant={ok ? "jade" : "rose"}>
          {ok ? <CheckCircle2 className="size-3" /> : <AlertTriangle className="size-3" />}
          {ok ? "Deliverable" : "Unavailable"}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-3 p-4">
        <div>
          <p className="text-[0.7rem] uppercase tracking-widest text-muted-foreground">Flat rate</p>
          <p className="tnum mt-0.5 text-xl font-semibold text-card-foreground">
            {formatMoney({ amount: result.rate, currency: result.currency })}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">one shipment, any cart size</p>
        </div>
        <div>
          <p className="text-[0.7rem] uppercase tracking-widest text-muted-foreground">
            {ok ? "Delivery date" : "Next available"}
          </p>
          <p className="mt-0.5 text-base font-medium text-card-foreground">
            {ok ? result.checkedDate : result.nextAvailableDate ?? "—"}
          </p>
        </div>
      </div>

      {(result.reason || result.perishableWarning) && (
        <div className="space-y-2 border-t border-border bg-muted/40 px-4 py-3">
          {result.reason && (
            <p className="flex gap-2 text-xs text-muted-foreground">
              <CalendarClock className="mt-0.5 size-3.5 shrink-0" />
              {result.reason}
            </p>
          )}
          {result.perishableWarning && (
            <p className="flex gap-2 text-xs text-rose">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
              {result.perishableWarning}
            </p>
          )}
        </div>
      )}
    </motion.div>
  );
}
