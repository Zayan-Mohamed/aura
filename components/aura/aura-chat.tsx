"use client";

import * as React from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { AnimatePresence, motion } from "motion/react";
import { Moon, Sun, RotateCcw, AlertTriangle, PanelLeft } from "lucide-react";
import type { AuraUIMessage } from "@/lib/ai-types";
import type { ConversationRow } from "@/lib/supabase/types";
import { AuraMark } from "./aura-mark";
import { ChatMessage } from "./message";
import { Hero } from "./hero";
import { Composer } from "./composer";
import { TypingIndicator } from "./typing";
import { ProfileDrawer } from "./profile-drawer";
import { BasketDrawer } from "./basket-drawer";
import { LeftSidebar } from "./left-sidebar";
import { SignInDialog } from "@/components/auth/sign-in-dialog";
import { useAuth } from "@/components/auth/auth-provider";
import { useProfile, profileHasContent } from "@/lib/use-profile";
import { useBasket, basketStore } from "@/lib/use-basket";
import { visualSearchEnabled } from "@/lib/flags";
import * as cloud from "@/lib/cloud";

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

function firstUserText(messages: AuraUIMessage[]): string {
  const first = messages.find((m) => m.role === "user");
  const part = first?.parts.find((p) => p.type === "text") as { text?: string } | undefined;
  return part?.text?.slice(0, 80) ?? "New chat";
}

export function AuraChat() {
  const { supabase, user, signOut } = useAuth();
  const { profile, update, clear } = useProfile();
  const { items: basketItems } = useBasket();

  const transport = React.useMemo(
    () => new DefaultChatTransport<AuraUIMessage>({ api: "/api/chat" }),
    [],
  );
  const { messages, sendMessage, status, stop, setMessages, regenerate, error } =
    useChat<AuraUIMessage>({ transport });

  const busy = status === "submitted" || status === "streaming";
  const ask = React.useCallback(
    (text: string, imageDataUrl?: string) =>
      void sendMessage(
        imageDataUrl
          ? { text: text || "Find me the closest match to this", metadata: { imageDataUrl } }
          : { text },
        { body: { profile, ...(imageDataUrl ? { imageDataUrl } : {}) } },
      ),
    [sendMessage, profile],
  );

  // --- sidebar / auth UI state ---
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [signInOpen, setSignInOpen] = React.useState(false);
  const [conversations, setConversations] = React.useState<ConversationRow[]>([]);
  const [conversationId, setConversationId] = React.useState<string | null>(null);

  // Latest-value refs so the persistence effect can read without re-subscribing.
  const conversationIdRef = React.useRef<string | null>(null);
  const messagesRef = React.useRef(messages);
  const profileRef = React.useRef(profile);
  const savedIds = React.useRef<Set<string>>(new Set());
  React.useEffect(() => {
    messagesRef.current = messages;
    profileRef.current = profile;
  });

  const refreshConversations = React.useCallback(async () => {
    if (!user) return;
    setConversations(await cloud.listConversations(supabase, user.id));
  }, [supabase, user]);

  // --- on sign-in: pull profile + basket from the cloud (or push local up) ---
  React.useEffect(() => {
    if (!user) {
      // Sync from the external auth system — clear cloud state on sign-out.
      /* eslint-disable react-hooks/set-state-in-effect */
      setConversations([]);
      setConversationId(null);
      /* eslint-enable react-hooks/set-state-in-effect */
      conversationIdRef.current = null;
      return;
    }
    let cancelled = false;
    (async () => {
      const dbProfile = await cloud.fetchProfile(supabase, user.id);
      if (cancelled) return;
      if (dbProfile && profileHasContent(dbProfile)) update(dbProfile);
      else if (profileHasContent(profileRef.current))
        await cloud.upsertProfile(supabase, user.id, profileRef.current);

      const dbBasket = await cloud.fetchBasket(supabase, user.id);
      if (cancelled) return;
      if (dbBasket && dbBasket.length) basketStore.replace(dbBasket);
      else if (basketStore.snapshot().length)
        await cloud.upsertBasket(supabase, user.id, basketStore.snapshot());

      if (!cancelled) await refreshConversations();
    })();
    return () => {
      cancelled = true;
    };
  }, [user, supabase, update, refreshConversations]);

  // --- write-through profile + basket changes while signed in (debounced) ---
  React.useEffect(() => {
    if (!user) return;
    const t = setTimeout(() => void cloud.upsertProfile(supabase, user.id, profile), 700);
    return () => clearTimeout(t);
  }, [profile, user, supabase]);

  React.useEffect(() => {
    if (!user) return;
    const t = setTimeout(() => void cloud.upsertBasket(supabase, user.id, basketItems), 700);
    return () => clearTimeout(t);
  }, [basketItems, user, supabase]);

  // --- persist each completed turn (messages + orders) for signed-in users ---
  React.useEffect(() => {
    if (status !== "ready" || !user) return;
    const msgs = messagesRef.current;
    const unsaved = msgs.filter(
      (m) => (m.role === "user" || m.role === "assistant") && !savedIds.current.has(m.id),
    );
    if (unsaved.length === 0) return;

    let cancelled = false;
    (async () => {
      let convId = conversationIdRef.current;
      if (!convId) {
        convId = await cloud.createConversation(supabase, user.id, firstUserText(msgs));
        if (!convId || cancelled) return;
        conversationIdRef.current = convId;
        setConversationId(convId);
      }
      await cloud.saveMessages(supabase, convId, user.id, unsaved);
      for (const m of unsaved) savedIds.current.add(m.id);
      for (const o of cloud.ordersFromMessages(unsaved)) {
        await cloud.saveOrder(supabase, user.id, convId, o);
      }
      await cloud.touchConversation(supabase, convId);
      if (!cancelled) await refreshConversations();
    })();
    return () => {
      cancelled = true;
    };
  }, [status, user, supabase, refreshConversations]);

  // --- chat actions ---
  const newChat = React.useCallback(() => {
    stop();
    setMessages([]);
    setConversationId(null);
    conversationIdRef.current = null;
  }, [stop, setMessages]);

  const selectConversation = React.useCallback(
    async (id: string) => {
      const loaded = await cloud.loadMessages(supabase, id);
      for (const m of loaded) savedIds.current.add(m.id);
      setMessages(loaded);
      setConversationId(id);
      conversationIdRef.current = id;
    },
    [supabase, setMessages],
  );

  const removeConversation = React.useCallback(
    async (id: string) => {
      await cloud.deleteConversation(supabase, id);
      if (id === conversationIdRef.current) newChat();
      await refreshConversations();
    },
    [supabase, newChat, refreshConversations],
  );

  // Keep the latest turn in view while content streams in.
  const endRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, status]);

  const empty = messages.length === 0;

  return (
    <div className="relative flex min-h-dvh flex-col">
      <LeftSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        user={user}
        conversations={conversations}
        activeId={conversationId}
        onNewChat={newChat}
        onSelect={selectConversation}
        onDelete={removeConversation}
        onSignIn={() => setSignInOpen(true)}
        onSignOut={signOut}
      />
      <SignInDialog open={signInOpen} onClose={() => setSignInOpen(false)} />

      {/* Header */}
      <header className="glass sticky top-0 z-30 border-b border-border/70">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-3 sm:px-8">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              aria-label="Open chats"
              onClick={() => setSidebarOpen(true)}
              className="grid size-9 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <PanelLeft className="size-4" />
            </button>
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
                onClick={newChat}
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
      <main className="aura-scroll relative w-full flex-1 overflow-y-auto overflow-x-hidden [scrollbar-gutter:stable_both-edges]">
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
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background via-background/85 to-transparent" />
        <div className="relative mx-auto w-full max-w-7xl px-5 pb-5 pt-2 sm:px-8">
          <Composer
            onSend={ask}
            onStop={stop}
            busy={busy}
            allowImage={visualSearchEnabled}
            imageEnabled={visualSearchEnabled && !!user}
            onRequireAuth={() => setSignInOpen(true)}
          />
          <p className="mt-2 text-center text-[0.7rem] text-muted-foreground/70">
            Aura shops the live Kapruka catalog · prices in LKR
          </p>
        </div>
      </div>
    </div>
  );
}
