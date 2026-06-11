"use client";

import * as React from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { AnimatePresence, motion } from "motion/react";
import { Moon, Sun, RotateCcw, AlertTriangle } from "lucide-react";
import type { AuraUIMessage } from "@/lib/ai-types";
import { AuraMark } from "./aura-mark";
import { ChatMessage } from "./message";
import { Hero } from "./hero";
import { Composer } from "./composer";
import { TypingIndicator } from "./typing";
import { ProfileDrawer } from "./profile-drawer";
import { BasketDrawer } from "./basket-drawer";
import { useProfile } from "@/lib/use-profile";

function ThemeToggle() {
  const [dark, setDark] = React.useState(false);
  React.useEffect(() => {
    const prefers = window.matchMedia("(prefers-color-scheme: dark)").matches;
    // One-time sync of theme state with the OS preference on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDark(prefers);
    document.documentElement.classList.toggle("dark", prefers);
  }, []);
  return (
    <button
      type="button"
      aria-label="Toggle theme"
      onClick={() => {
        setDark((d) => {
          document.documentElement.classList.toggle("dark", !d);
          return !d;
        });
      }}
      className="grid size-9 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}

export function AuraChat() {
  const { profile, update, clear } = useProfile();

  const transport = React.useMemo(
    () => new DefaultChatTransport<AuraUIMessage>({ api: "/api/chat" }),
    [],
  );
  const { messages, sendMessage, status, stop, setMessages, regenerate, error } =
    useChat<AuraUIMessage>({ transport });

  const busy = status === "submitted" || status === "streaming";
  // The saved profile rides along as request body on every turn — the API route
  // folds it into the system prompt (default delivery city, checkout details…).
  const ask = React.useCallback(
    (text: string) => void sendMessage({ text }, { body: { profile } }),
    [sendMessage, profile],
  );

  // Keep the latest turn in view while content streams in.
  const endRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, status]);

  const empty = messages.length === 0;

  return (
    <div className="relative flex min-h-dvh flex-col">
      {/* Header */}
      <header className="glass sticky top-0 z-30 border-b border-border/70">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-3 sm:px-8">
          <div className="flex items-center gap-2.5">
            <div className="grid size-9 place-items-center rounded-xl bg-card ring-1 ring-border">
              <AuraMark className="size-5" />
            </div>
            <div className="leading-none">
              <p className="font-heading text-lg text-foreground">Aura</p>
              <p className="text-[0.7rem] tracking-wide text-muted-foreground">
                Kapruka concierge
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!empty && (
              <button
                type="button"
                onClick={() => setMessages([])}
                className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <RotateCcw className="size-3.5" /> New chat
              </button>
            )}
            <ThemeToggle />
            <BasketDrawer onCheckout={ask} />
            <ProfileDrawer profile={profile} onUpdate={update} onClear={clear} />
          </div>
        </div>
      </header>

      {/* Conversation */}
      <main className="aura-scroll relative w-full flex-1 overflow-y-auto [scrollbar-gutter:stable_both-edges]">
        {/* Full-bleed hero glow — spans the whole viewport, not the centered column. */}
        {empty && (
          <div className="aura-radial aura-drift pointer-events-none absolute inset-x-0 top-0 -z-10 h-[55vh]" />
        )}
        <div className="relative z-10 mx-auto flex min-h-full w-full max-w-7xl flex-col px-5 pb-40 pt-6 sm:px-8">
          {empty ? (
            <Hero onAsk={ask} />
          ) : (
            <div className="flex flex-col gap-6">
              {messages.map((m) => (
                <ChatMessage key={m.id} message={m} onAsk={ask} />
              ))}

              <AnimatePresence>
                {status === "submitted" && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-3"
                  >
                    <div className="grid size-8 place-items-center rounded-full bg-gold/12 ring-1 ring-gold/20">
                      <AuraMark className="size-5" />
                    </div>
                    <TypingIndicator />
                  </motion.div>
                )}
              </AnimatePresence>

              {status === "error" && (
                <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                  <AlertTriangle className="size-4 shrink-0" />
                  <span className="flex-1">
                    {error?.message || "Something went wrong reaching Aura."}
                  </span>
                  <button
                    type="button"
                    onClick={() => regenerate({ body: { profile } })}
                    className="rounded-full border border-destructive/30 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-destructive/10"
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* scroll-mb keeps the latest card clear of the fixed composer. */}
              <div ref={endRef} className="scroll-mb-40" />
            </div>
          )}
        </div>
      </main>

      {/* Composer */}
      <div className="fixed inset-x-0 bottom-0 z-30">
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent" />
        <div className="relative mx-auto w-full max-w-7xl px-5 pb-5 pt-2 sm:px-8">
          <Composer onSend={ask} onStop={stop} busy={busy} />
          <p className="mt-2 text-center text-[0.7rem] text-muted-foreground/70">
            Aura shops the live Kapruka catalog · prices in LKR
          </p>
        </div>
      </div>
    </div>
  );
}
