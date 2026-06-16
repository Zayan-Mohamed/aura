"use client";

import * as React from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { AnimatePresence, motion } from "motion/react";
import { Moon, Sun, RotateCcw, AlertTriangle, PanelLeft, Share2, MoreVertical } from "lucide-react";
import type { AuraUIMessage } from "@/lib/ai-types";
import type { ConversationRow, OrderRow } from "@/lib/supabase/types";
import { AuraMark } from "./aura-mark";
import { ChatMessage } from "./message";
import { Hero } from "./hero";
import { Composer } from "./composer";
import { QuickReplies } from "./quick-replies";
import { deriveQuickReplies } from "@/lib/quick-replies";
import { TypingIndicator } from "./typing";
import { ProfileDrawer } from "./profile-drawer";
import { BasketDrawer } from "./basket-drawer";
import { LeftSidebar } from "./left-sidebar";
import { TierBadge } from "./tier-badge";
import { TierSidebar } from "./tier-sidebar";
import { ReorderDialog } from "./reorder-dialog";
import { UsualsCarousel, usualsFromOrders } from "./usuals-carousel";
import { ShareDialog } from "./share-dialog";
import { SignInDialog } from "@/components/auth/sign-in-dialog";
import { useAuth } from "@/components/auth/auth-provider";
import { useProfile, profileHasContent } from "@/lib/use-profile";
import { useBasket, basketStore } from "@/lib/use-basket";
import { visualSearchEnabled } from "@/lib/flags";
import * as cloud from "@/lib/cloud";

/**
 * Header overflow menu — keeps the bar uncluttered on mobile by tucking the
 * secondary actions (new chat, share, theme) behind one ⋮ button, so the brand
 * + tier badge and the core Basket/Profile controls stay visible.
 */
function HeaderMenu({
  empty,
  onNewChat,
  onShare,
}: {
  empty: boolean;
  onNewChat: () => void;
  onShare: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [dark, setDark] = React.useState(false);

  React.useEffect(() => {
    const prefers = window.matchMedia("(prefers-color-scheme: dark)").matches;
    // One-time sync of theme state with the OS preference on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDark(prefers);
    document.documentElement.classList.toggle("dark", prefers);
  }, []);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const toggleTheme = () =>
    setDark((d) => {
      document.documentElement.classList.toggle("dark", !d);
      return !d;
    });

  const item =
    "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted";

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="More options"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="grid size-9 shrink-0 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <MoreVertical className="size-4" />
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
            <motion.div
              role="menu"
              initial={{ opacity: 0, y: -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.97 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full z-50 mt-2 w-48 rounded-2xl border border-border bg-background p-1.5 shadow-xl"
            >
              {!empty && (
                <button
                  type="button"
                  role="menuitem"
                  className={item}
                  onClick={() => {
                    onNewChat();
                    setOpen(false);
                  }}
                >
                  <RotateCcw className="size-4 text-muted-foreground" /> New chat
                </button>
              )}
              {!empty && (
                <button
                  type="button"
                  role="menuitem"
                  className={item}
                  onClick={() => {
                    onShare();
                    setOpen(false);
                  }}
                >
                  <Share2 className="size-4 text-muted-foreground" /> Share chat
                </button>
              )}
              <button type="button" role="menuitem" className={item} onClick={toggleTheme}>
                {dark ? (
                  <Sun className="size-4 text-muted-foreground" />
                ) : (
                  <Moon className="size-4 text-muted-foreground" />
                )}
                {dark ? "Light mode" : "Dark mode"}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
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
  // Verified (paid) orders → Aura Prestige tier, shown on the header badge.
  const [orderCount, setOrderCount] = React.useState(0);

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
  const [tierOpen, setTierOpen] = React.useState(false);
  const [signInOpen, setSignInOpen] = React.useState(false);
  const [shareOpen, setShareOpen] = React.useState(false);
  const [reorderOrder, setReorderOrder] = React.useState<OrderRow | null>(null);
  const [conversations, setConversations] = React.useState<ConversationRow[]>([]);
  const [orders, setOrders] = React.useState<OrderRow[]>([]);
  const [occasions, setOccasions] = React.useState<cloud.Occasion[]>([]);
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

  const refreshOrders = React.useCallback(async () => {
    if (!user) return;
    setOrders(await cloud.listOrders(supabase, user.id));
  }, [supabase, user]);

  const refreshOccasions = React.useCallback(async () => {
    if (!user) return;
    setOccasions(await cloud.listOccasions(supabase, user.id));
  }, [supabase, user]);

  const addOccasion = React.useCallback(
    async (o: { label: string; occasionDate: string; recipientName: string; recipientCity: string }) => {
      if (!user) return;
      const created = await cloud.addOccasion(supabase, user.id, o);
      if (created) setOccasions((prev) => [...prev, created].sort((a, b) => a.occasionDate.localeCompare(b.occasionDate)));
    },
    [supabase, user],
  );

  const deleteOccasion = React.useCallback(
    async (id: string) => {
      setOccasions((prev) => prev.filter((o) => o.id !== id));
      await cloud.deleteOccasion(supabase, id);
    },
    [supabase],
  );

  // One-tap reorder → open the confirmation dialog, which rebuilds the order
  // server-side (saved items + address, soonest date) and returns a pay link
  // directly. No AI round-trip, no questions.
  const reorder = React.useCallback((order: OrderRow) => {
    setReorderOrder(order);
    setSidebarOpen(false);
  }, []);

  // --- on sign-in: pull profile + basket from the cloud (or push local up) ---
  React.useEffect(() => {
    if (!user) {
      // Sync from the external auth system — clear cloud state on sign-out.
      /* eslint-disable react-hooks/set-state-in-effect */
      setConversations([]);
      setOrders([]);
      setOrderCount(0);
      setOccasions([]);
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
      if (!cancelled) await refreshOrders();
      // Total order count → Aura Prestige tier (set inline; the list is capped).
      if (!cancelled) setOrderCount(await cloud.countOrders(supabase, user.id));
      if (!cancelled) await refreshOccasions();
    })();
    return () => {
      cancelled = true;
    };
  }, [user, supabase, update, refreshConversations, refreshOrders, refreshOccasions]);

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
      // Snapshot the basket so each saved line carries name/price/image for reorder.
      const newOrders = cloud.ordersFromMessages(unsaved, basketStore.snapshot());
      for (const o of newOrders) {
        await cloud.saveOrder(supabase, user.id, convId, o);
      }
      await cloud.touchConversation(supabase, convId);
      if (!cancelled) await refreshConversations();
      // A fresh checkout link updates the reorder list (but NOT the tier — only
      // a verified PAID order does that).
      if (!cancelled && newOrders.length) await refreshOrders();
      // A verified trackOrder credits the tier; lift the new count off its result
      // so the badge updates live without a reload.
      let tierCount: number | undefined;
      for (const m of unsaved) {
        if (m.role !== "assistant") continue;
        for (const part of m.parts as { type?: string; output?: { loyalty?: { count?: number } | null } }[]) {
          if (part?.type === "tool-trackOrder" && typeof part.output?.loyalty?.count === "number") {
            tierCount = part.output.loyalty.count;
          }
        }
      }
      if (!cancelled && typeof tierCount === "number") setOrderCount(tierCount);
    })();
    return () => {
      cancelled = true;
    };
  }, [status, user, supabase, refreshConversations, refreshOrders]);

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

  // Edit a user turn (ChatGPT-style): drop it and everything after, purge those
  // from the saved conversation, then re-ask the new text — Aura regenerates.
  const editMessage = React.useCallback(
    (messageId: string, next: string) => {
      const all = messagesRef.current;
      const idx = all.findIndex((m) => m.id === messageId);
      if (idx === -1) return;
      const removedIds = all.slice(idx).map((m) => m.id);
      stop();
      setMessages(all.slice(0, idx));
      for (const id of removedIds) savedIds.current.delete(id);
      if (user) void cloud.deleteMessages(supabase, removedIds);
      ask(next);
    },
    [stop, setMessages, ask, user, supabase],
  );

  // Mint a public, snapshot share link for the current conversation. We strip
  // metadata (image data URLs) and keep just role + parts so the recipient sees
  // the transcript + product cards. Signed-in only (the row is owner-scoped).
  const shareChat = React.useCallback(async (): Promise<string | null> => {
    if (!user) return null;
    const snapshot = messagesRef.current.map((m) => ({ id: m.id, role: m.role, parts: m.parts }));
    if (snapshot.length === 0) return null;
    const token = await cloud.createShare(supabase, user.id, firstUserText(messagesRef.current), snapshot);
    return token ? `${window.location.origin}/share/${token}` : null;
  }, [user, supabase]);

  // Keep the latest turn in view while content streams in.
  const endRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, status]);

  const empty = messages.length === 0;

  // "Your usuals" — products pulled from the signed-in shopper's past orders,
  // de-duplicated, so the home screen can offer one-tap re-add without asking.
  const usuals = React.useMemo(() => usualsFromOrders(orders), [orders]);

  return (
    <div className="relative flex min-h-dvh flex-col">
      <LeftSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        user={user}
        conversations={conversations}
        orders={orders}
        activeId={conversationId}
        onNewChat={newChat}
        onSelect={selectConversation}
        onDelete={removeConversation}
        onReorder={reorder}
        onSignIn={() => setSignInOpen(true)}
        onSignOut={signOut}
      />
      <TierSidebar
        open={tierOpen}
        onClose={() => setTierOpen(false)}
        signedIn={!!user}
        orderCount={orderCount}
        onSignIn={() => {
          setTierOpen(false);
          setSignInOpen(true);
        }}
      />
      <ReorderDialog
        order={reorderOrder}
        onClose={() => setReorderOrder(null)}
        onReordered={refreshOrders}
      />
      <ShareDialog open={shareOpen} onClose={() => setShareOpen(false)} onCreate={shareChat} />
      <SignInDialog open={signInOpen} onClose={() => setSignInOpen(false)} />

      {/* Header */}
      <header className="glass sticky top-0 z-30 border-b border-border/70">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-2 px-4 py-3 sm:px-8">
          <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
            <button
              type="button"
              aria-label="Open chats"
              onClick={() => setSidebarOpen(true)}
              className="grid size-9 shrink-0 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <PanelLeft className="size-4" />
            </button>
            <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-card ring-1 ring-border">
              <AuraMark className="size-5" />
            </div>
            <div className="min-w-0 leading-none">
              <p className="font-heading text-lg text-foreground">Aura</p>
              <p className="hidden truncate text-[0.7rem] tracking-wide text-muted-foreground sm:block">
                Kapruka concierge
              </p>
            </div>
            <TierBadge orderCount={user ? orderCount : null} onClick={() => setTierOpen(true)} />
          </div>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <HeaderMenu
              empty={empty}
              onNewChat={newChat}
              onShare={() => (user ? setShareOpen(true) : setSignInOpen(true))}
            />
            <BasketDrawer onCheckout={ask} />
            <ProfileDrawer
              profile={profile}
              onUpdate={update}
              onClear={clear}
              signedIn={!!user}
              occasions={occasions}
              onAddOccasion={addOccasion}
              onDeleteOccasion={deleteOccasion}
              onRequireAuth={() => setSignInOpen(true)}
            />
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
            <>
              <Hero onAsk={ask} />
              {!!user && usuals.length > 0 && <UsualsCarousel items={usuals} />}
            </>
          ) : (
            <div className="flex flex-col gap-6">
              {messages.map((m) => (
                <ChatMessage key={m.id} message={m} onAsk={ask} onEdit={editMessage} />
              ))}

              {/* Contextual follow-up chips under the latest assistant reply */}
              {status === "ready" &&
                (() => {
                  const last = messages[messages.length - 1];
                  if (last?.role !== "assistant") return null;
                  const replies = deriveQuickReplies(
                    last.parts as Parameters<typeof deriveQuickReplies>[0],
                  );
                  return <QuickReplies replies={replies} onAsk={ask} />;
                })()}

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
            language={profile.language}
          />
          <p className="mt-2 text-center text-[0.7rem] text-muted-foreground/70">
            Aura shops the live Kapruka catalog · prices in LKR
          </p>
        </div>
      </div>
    </div>
  );
}
