"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Menu, X, MapPin, User, Phone, Home, Languages, NotebookPen, ArrowRight, Trash2 } from "lucide-react";
import type { ShopperProfile, ShopperLanguage } from "@/lib/use-profile";
import { profileHasContent } from "@/lib/use-profile";
import { cn } from "@/lib/utils";

const LANGUAGES: { value: ShopperLanguage; label: string; hint?: string }[] = [
  { value: "auto", label: "Auto" },
  { value: "english", label: "English" },
  { value: "sinhala", label: "සිංහල" },
  { value: "singlish", label: "Singlish" },
  { value: "tanglish", label: "Tanglish" },
];

function Field({
  icon: Icon,
  label,
  hint,
  children,
}: {
  icon: React.ElementType;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-center gap-1.5 text-[0.7rem] font-medium uppercase tracking-widest text-muted-foreground">
        <Icon className="size-3.5 text-gold" />
        {label}
      </span>
      {children}
      {hint && <span className="text-[0.7rem] text-muted-foreground/70">{hint}</span>}
    </label>
  );
}

const inputCls =
  "w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-card-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-gold/50 focus:ring-2 focus:ring-gold/15";

export function ProfileDrawer({
  profile,
  onUpdate,
  onClear,
}: {
  profile: ShopperProfile;
  onUpdate: (patch: Partial<ShopperProfile>) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const reduce = useReducedMotion();

  // Portal target is only available on the client.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  React.useEffect(() => setMounted(true), []);

  // Close on Escape + lock body scroll while the drawer is open.
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  const filled = profileHasContent(profile);

  return (
    <>
      <button
        type="button"
        aria-label="Your details & guide"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="relative grid size-9 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Menu className="size-4" />
        {/* A subtle dot signals saved details without opening the drawer. */}
        {filled && (
          <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-gold ring-2 ring-background" />
        )}
      </button>

      {mounted &&
        createPortal(
          <AnimatePresence>
            {open && (
              <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 bg-foreground/30 backdrop-blur-sm"
            />
            <motion.aside
              key="panel"
              role="dialog"
              aria-modal="true"
              aria-label="Your details"
              initial={reduce ? { opacity: 0 } : { x: "100%" }}
              animate={reduce ? { opacity: 1 } : { x: 0 }}
              exit={reduce ? { opacity: 0 } : { x: "100%" }}
              transition={
                reduce
                  ? { duration: 0.15 }
                  : { type: "spring", stiffness: 380, damping: 38 }
              }
              className="glass fixed inset-y-0 right-0 z-50 flex w-[88%] max-w-sm flex-col border-l border-border bg-background/95 shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3 border-b border-border/70 px-5 py-4">
                <div>
                  <p className="font-heading text-lg text-foreground">Your details</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    Aura uses these to check delivery and speed up checkout. Saved on this
                    device only.
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Close"
                  onClick={() => setOpen(false)}
                  className="grid size-8 shrink-0 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Form */}
              <div className="aura-scroll flex-1 space-y-4 overflow-y-auto px-5 py-5">
                <Field icon={User} label="Your name">
                  <input
                    className={inputCls}
                    value={profile.name}
                    onChange={(e) => onUpdate({ name: e.target.value })}
                    placeholder="e.g. Nimal Perera"
                    autoComplete="name"
                  />
                </Field>

                <Field icon={Phone} label="Phone">
                  <input
                    className={inputCls}
                    value={profile.phone}
                    onChange={(e) => onUpdate({ phone: e.target.value })}
                    placeholder="077 123 4567"
                    inputMode="tel"
                    autoComplete="tel"
                  />
                </Field>

                <Field icon={MapPin} label="City" hint="Aura checks delivery here automatically.">
                  <input
                    className={inputCls}
                    value={profile.city}
                    onChange={(e) => onUpdate({ city: e.target.value })}
                    placeholder="e.g. Colombo 05, Kandy, Galle"
                    autoComplete="address-level2"
                  />
                </Field>

                <Field icon={Home} label="Delivery address">
                  <textarea
                    className={cn(inputCls, "min-h-[4.5rem] resize-none")}
                    value={profile.address}
                    onChange={(e) => onUpdate({ address: e.target.value })}
                    placeholder="House / street, area"
                    autoComplete="street-address"
                  />
                </Field>

                <Field
                  icon={Languages}
                  label="Reply language"
                  hint="Singlish = Sinhala + English · Tanglish = Tamil + English."
                >
                  <div className="flex flex-wrap gap-1.5">
                    {LANGUAGES.map((l) => (
                      <button
                        key={l.value}
                        type="button"
                        onClick={() => onUpdate({ language: l.value })}
                        className={cn(
                          "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                          profile.language === l.value
                            ? "border-transparent bg-foreground text-background"
                            : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
                        )}
                      >
                        {l.label}
                      </button>
                    ))}
                  </div>
                </Field>

                <Field
                  icon={NotebookPen}
                  label="Anything Aura should know?"
                  hint="Preferences, allergies, urgency — e.g. “sugar-free”, “need it today”."
                >
                  <textarea
                    className={cn(inputCls, "min-h-[4.5rem] resize-none")}
                    value={profile.notes}
                    onChange={(e) => onUpdate({ notes: e.target.value })}
                    placeholder="Optional notes for Aura"
                  />
                </Field>

                {filled && (
                  <button
                    type="button"
                    onClick={onClear}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" /> Clear details
                  </button>
                )}
              </div>

              {/* Footer — navigate to the guide */}
              <div className="border-t border-border/70 px-5 py-4">
                <Link
                  href="/guide"
                  onClick={() => setOpen(false)}
                  className="group flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-left transition-colors hover:border-gold/40 hover:bg-gold/5"
                >
                  <span>
                    <span className="block text-sm font-semibold text-card-foreground">
                      How Aura works
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      What it can do, demos & tips
                    </span>
                  </span>
                  <ArrowRight className="size-4 shrink-0 text-gold transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            </motion.aside>
              </>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}
