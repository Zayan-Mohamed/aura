"use client";

import * as React from "react";
import { CalendarHeart, Plus, Trash2, Bell } from "lucide-react";
import type { Occasion } from "@/lib/cloud";
import { cn } from "@/lib/utils";

const inputCls =
  "w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-card-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-gold/50 focus:ring-2 focus:ring-gold/15";

/** Friendly "Sat 14 Jun" from a YYYY-MM-DD string. */
function prettyDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00+05:30`);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("en-LK", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Asia/Colombo",
  }).format(d);
}

export function OccasionsSection({
  signedIn,
  occasions,
  onAdd,
  onDelete,
  onRequireAuth,
}: {
  signedIn: boolean;
  occasions: Occasion[];
  onAdd: (o: { label: string; occasionDate: string; recipientName: string; recipientCity: string }) => void;
  onDelete: (id: string) => void;
  onRequireAuth: () => void;
}) {
  const [adding, setAdding] = React.useState(false);
  const [label, setLabel] = React.useState("");
  const [date, setDate] = React.useState("");
  const [recipient, setRecipient] = React.useState("");
  const [city, setCity] = React.useState("");

  const reset = () => {
    setLabel("");
    setDate("");
    setRecipient("");
    setCity("");
    setAdding(false);
  };

  const submit = () => {
    if (!label.trim() || !date) return;
    onAdd({ label: label.trim(), occasionDate: date, recipientName: recipient.trim(), recipientCity: city.trim() });
    reset();
  };

  return (
    <div className="flex flex-col gap-2 border-t border-border/70 pt-4">
      <div className="flex items-center gap-1.5 text-[0.7rem] font-medium uppercase tracking-widest text-muted-foreground">
        <CalendarHeart className="size-3.5 text-gold" />
        Occasion reminders
      </div>

      {!signedIn ? (
        <button
          type="button"
          onClick={onRequireAuth}
          className="rounded-xl border border-dashed border-border bg-card/50 px-3 py-3 text-left text-xs leading-relaxed text-muted-foreground transition-colors hover:border-gold/40 hover:text-foreground"
        >
          Sign in to save birthdays and anniversaries - Aura will email you a few days
          before, so a gift always arrives in time.
        </button>
      ) : (
        <>
          {occasions.length > 0 && (
            <ul className="flex flex-col gap-1.5">
              {occasions.map((o) => (
                <li
                  key={o.id}
                  className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2"
                >
                  <Bell className="size-3.5 shrink-0 text-gold" />
                  <div className="min-w-0 flex-1 leading-tight">
                    <p className="truncate text-sm font-medium text-card-foreground">{o.label}</p>
                    <p className="truncate text-[0.7rem] text-muted-foreground">
                      {prettyDate(o.occasionDate)}
                      {o.recipientName ? ` · ${o.recipientName}` : ""}
                      {o.recipientCity ? ` · ${o.recipientCity}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label={`Delete ${o.label}`}
                    onClick={() => onDelete(o.id)}
                    className="text-muted-foreground transition-colors hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {adding ? (
            <div className="flex flex-col gap-2 rounded-xl border border-border bg-card/60 p-3">
              <input
                autoFocus
                className={inputCls}
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Occasion, e.g. Amma's birthday"
              />
              <input
                type="date"
                className={inputCls}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  className={inputCls}
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="For (optional)"
                />
                <input
                  className={inputCls}
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="City (optional)"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={submit}
                  disabled={!label.trim() || !date}
                  className={cn(
                    "flex-1 rounded-full px-3 py-2 text-xs font-semibold transition-colors",
                    label.trim() && date
                      ? "bg-gold text-gold-foreground hover:brightness-105"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  Save reminder
                </button>
                <button
                  type="button"
                  onClick={reset}
                  className="rounded-full border border-border px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="inline-flex w-fit items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-gold/40 hover:bg-gold/5 hover:text-foreground"
            >
              <Plus className="size-3.5" /> Add an occasion
            </button>
          )}
        </>
      )}
    </div>
  );
}
