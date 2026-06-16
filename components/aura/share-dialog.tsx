"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { X, Share2, Link2, Copy, Check, Loader2, AlertTriangle } from "lucide-react";
import { shareText } from "@/lib/share";

/**
 * Mint + present a public share link for the current chat. The link freezes a
 * snapshot of the conversation; anyone who opens it can view it and check out
 * the products, but never see future messages or the owner's other chats.
 */
export function ShareDialog({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  /** Mints the share and returns the full URL (or null on failure). */
  onCreate: () => Promise<string | null>;
}) {
  const reduce = useReducedMotion();
  const [mounted, setMounted] = React.useState(false);
  const [status, setStatus] = React.useState<"idle" | "loading" | "ready" | "error">("idle");
  const [url, setUrl] = React.useState("");
  const [copied, setCopied] = React.useState(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  React.useEffect(() => setMounted(true), []);

  // Fresh state each time the dialog opens.
  React.useEffect(() => {
    if (open) {
      /* eslint-disable react-hooks/set-state-in-effect */
      setStatus("idle");
      setUrl("");
      setCopied(false);
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!mounted) return null;

  const create = async () => {
    setStatus("loading");
    const link = await onCreate();
    if (link) {
      setUrl(link);
      setStatus("ready");
    } else {
      setStatus("error");
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked — ignore */
    }
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          className="fixed inset-0 z-[60] grid place-items-center bg-foreground/40 p-4 backdrop-blur-sm"
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Share chat"
            onClick={(e) => e.stopPropagation()}
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 12 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.97 }}
            transition={reduce ? { duration: 0.15 } : { type: "spring", stiffness: 320, damping: 28 }}
            className="w-full max-w-md rounded-3xl border border-border bg-background p-5 shadow-2xl"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Share2 className="size-4 text-gold" />
                <span className="font-heading text-lg text-foreground">Share this chat</span>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={onClose}
                className="grid size-8 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            {status === "ready" ? (
              <div className="mt-4">
                <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5">
                  <Link2 className="size-4 shrink-0 text-muted-foreground" />
                  <span className="truncate text-sm text-foreground">{url}</span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={copy}
                    className={`flex items-center justify-center gap-1.5 rounded-full border px-3 py-2.5 text-xs font-semibold transition-colors ${
                      copied
                        ? "border-jade/40 bg-jade/10 text-jade"
                        : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    {copied ? <><Check className="size-3.5" /> Copied</> : <><Copy className="size-3.5" /> Copy link</>}
                  </button>
                  <button
                    type="button"
                    onClick={() => void shareText(`Take a look at what I found on Aura:\n${url}`, "Aura chat")}
                    className="flex items-center justify-center gap-1.5 rounded-full bg-foreground px-3 py-2.5 text-xs font-semibold text-background transition-colors hover:bg-foreground/85"
                  >
                    <Share2 className="size-3.5" /> Share
                  </button>
                </div>
                <p className="mt-3 text-[0.72rem] leading-relaxed text-muted-foreground">
                  Anyone with this link can view this conversation and check out the products in it.
                  It&rsquo;s a snapshot — new messages you send won&rsquo;t appear.
                </p>
              </div>
            ) : (
              <div className="mt-4">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Create a link to this conversation. Whoever opens it can browse your picks, add them
                  to a basket, and check out securely — without an account.
                </p>
                {status === "error" && (
                  <div className="mt-3 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3.5 py-2.5 text-sm text-destructive">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                    <span>Couldn&rsquo;t create the link. Please try again.</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={create}
                  disabled={status === "loading"}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-gold px-5 py-3 text-sm font-semibold tracking-wide text-gold-foreground transition-all hover:brightness-105 active:translate-y-px disabled:opacity-60"
                >
                  {status === "loading" ? (
                    <>
                      <Loader2 className="size-4 animate-spin" /> Creating link…
                    </>
                  ) : (
                    <>
                      <Link2 className="size-4" /> Create share link
                    </>
                  )}
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
