"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { X, Plus, MessageSquare, Trash2, LogIn, LogOut, RotateCcw, Receipt } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import type { ConversationRow, OrderRow } from "@/lib/supabase/types";
import { AuraMark } from "./aura-mark";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

function orderItemCount(order: OrderRow): number {
  const items = (Array.isArray(order.items) ? order.items : []) as { quantity?: number }[];
  return items.reduce((n, i) => n + (i.quantity ?? 1), 0);
}

function orderTotal(order: OrderRow): string | null {
  const s = order.summary as { grand_total?: number; currency?: string } | null;
  if (!s || typeof s.grand_total !== "number") return null;
  return formatMoney({ amount: s.grand_total, currency: s.currency ?? "LKR" });
}

export function LeftSidebar({
  open,
  onClose,
  user,
  conversations,
  orders,
  activeId,
  onNewChat,
  onSelect,
  onDelete,
  onReorder,
  onSignIn,
  onSignOut,
}: {
  open: boolean;
  onClose: () => void;
  user: User | null;
  conversations: ConversationRow[];
  orders: OrderRow[];
  activeId: string | null;
  onNewChat: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onReorder: (order: OrderRow) => void;
  onSignIn: () => void;
  onSignOut: () => void;
}) {
  const reduce = useReducedMotion();
  const [mounted, setMounted] = React.useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-foreground/30 backdrop-blur-sm"
          />
          <motion.aside
            key="panel"
            aria-label="Chats"
            initial={reduce ? { opacity: 0 } : { x: "-100%" }}
            animate={reduce ? { opacity: 1 } : { x: 0 }}
            exit={reduce ? { opacity: 0 } : { x: "-100%" }}
            transition={reduce ? { duration: 0.15 } : { type: "spring", stiffness: 380, damping: 38 }}
            className="glass fixed inset-y-0 left-0 z-50 flex w-[86%] max-w-xs flex-col border-r border-border bg-background/95 shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-2 border-b border-border/70 px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="grid size-8 place-items-center rounded-lg bg-card ring-1 ring-border">
                  <AuraMark className="size-4" />
                </div>
                <span className="font-heading text-base text-foreground">Aura</span>
              </div>
              <button
                type="button"
                aria-label="Close sidebar"
                onClick={onClose}
                className="grid size-8 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="px-3 pt-3">
              <button
                type="button"
                onClick={() => {
                  onNewChat();
                  onClose();
                }}
                className="flex w-full items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-sm font-medium text-card-foreground transition-colors hover:border-gold/40 hover:bg-gold/5"
              >
                <Plus className="size-4 text-gold" /> New chat
              </button>
            </div>

            {/* Conversations */}
            <div className="aura-scroll mt-3 flex-1 overflow-y-auto px-2">
              {!user ? (
                <p className="px-3 py-6 text-center text-xs leading-relaxed text-muted-foreground">
                  Sign in to save your chats and pick up where you left off - on any device.
                </p>
              ) : conversations.length === 0 ? (
                <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                  No saved chats yet. Start a conversation and it’ll appear here.
                </p>
              ) : (
                <ul className="flex flex-col gap-0.5">
                  {conversations.map((c) => (
                    <li key={c.id} className="group/row relative">
                      <button
                        type="button"
                        onClick={() => {
                          onSelect(c.id);
                          onClose();
                        }}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-lg px-3 py-2 pr-8 text-left text-sm transition-colors",
                          c.id === activeId
                            ? "bg-gold/10 text-foreground"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        )}
                      >
                        <MessageSquare className="size-3.5 shrink-0 opacity-70" />
                        <span className="truncate">{c.title || "New chat"}</span>
                      </button>
                      <button
                        type="button"
                        aria-label="Delete chat"
                        onClick={() => onDelete(c.id)}
                        className="absolute right-1.5 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover/row:opacity-100"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Recent orders → one-tap reorder */}
            {user && orders.length > 0 && (
              <div className="border-t border-border/70 px-2 py-3">
                <p className="px-3 pb-1.5 text-[0.7rem] font-medium uppercase tracking-widest text-muted-foreground">
                  Recent orders
                </p>
                <ul className="flex max-h-44 flex-col gap-0.5 overflow-y-auto aura-scroll">
                  {orders.map((o) => {
                    const count = orderItemCount(o);
                    const total = orderTotal(o);
                    return (
                      <li
                        key={o.id}
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted/60"
                      >
                        <Receipt className="size-3.5 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1 leading-tight">
                          <p className="truncate text-xs font-medium text-foreground">{o.order_ref}</p>
                          <p className="truncate text-[0.7rem] text-muted-foreground">
                            {count > 0 ? `${count} item${count === 1 ? "" : "s"}` : "Order"}
                            {total ? ` · ${total}` : ""}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => onReorder(o)}
                          aria-label={`Reorder ${o.order_ref}`}
                          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[0.7rem] font-medium text-muted-foreground transition-colors hover:border-gold/40 hover:bg-gold/5 hover:text-foreground"
                        >
                          <RotateCcw className="size-3" /> Reorder
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {/* Account */}
            <div className="border-t border-border/70 p-3">
              {user ? (
                <div className="flex items-center gap-2.5">
                  <div className="grid size-8 shrink-0 place-items-center rounded-full bg-gold/15 text-xs font-semibold uppercase text-gold">
                    {(user.email ?? "?").slice(0, 1)}
                  </div>
                  <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                    {user.email}
                  </span>
                  <button
                    type="button"
                    aria-label="Sign out"
                    onClick={onSignOut}
                    className="grid size-8 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <LogOut className="size-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    onSignIn();
                    onClose();
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background transition-colors hover:bg-foreground/85"
                >
                  <LogIn className="size-4" /> Sign in
                </button>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
