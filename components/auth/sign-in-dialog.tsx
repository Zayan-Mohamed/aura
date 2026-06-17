"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { X, Mail, Lock, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useAuth } from "./auth-provider";
import { AuraMark } from "@/components/aura/aura-mark";
import { cn } from "@/lib/utils";

const inputCls =
  "w-full rounded-xl border border-border bg-card px-9 py-2.5 text-sm text-card-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-gold/50 focus:ring-2 focus:ring-gold/15";

export function SignInDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { supabase } = useAuth();
  const reduce = useReducedMotion();
  const [mounted, setMounted] = React.useState(false);
  const [mode, setMode] = React.useState<"signin" | "signup">("signin");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const emailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data.session) {
          onClose();
        } else if (data.user && (data.user.identities?.length ?? 0) === 0) {
          // Supabase returns a user with an EMPTY identities array when the email
          // already has an account (anti-enumeration) - and sends no confirmation
          // email. Tell the shopper plainly instead of "check your inbox".
          setError(
            "This email already has an account. Try signing in instead - or continue with Google if that's how you joined.",
          );
          setMode("signin");
        } else {
          setNotice("Check your inbox to confirm your email (it can take a minute - also check spam), then sign in.");
          setMode("signin");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const googleSignIn = async () => {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) setError(error.message);
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] grid place-items-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Sign in to Aura"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.98 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-border bg-background p-6 shadow-2xl"
          >
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="absolute right-4 top-4 grid size-8 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="size-4" />
            </button>

            <div className="flex flex-col items-center text-center">
              <div className="grid size-12 place-items-center rounded-2xl bg-card ring-1 ring-border">
                <AuraMark className="size-7" />
              </div>
              <h2 className="font-heading mt-3 text-xl text-foreground">
                {mode === "signin" ? "Welcome back" : "Create your account"}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Sign in to save your chats, basket and orders.
              </p>
            </div>

            <button
              type="button"
              onClick={googleSignIn}
              className="mt-5 flex w-full items-center justify-center gap-2.5 rounded-full border border-border bg-card px-4 py-2.5 text-sm font-medium text-card-foreground transition-colors hover:bg-muted"
            >
              <GoogleIcon className="size-4" /> Continue with Google
            </button>

            <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
            </div>

            <form onSubmit={emailSubmit} className="flex flex-col gap-3">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="password"
                  required
                  minLength={6}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputCls}
                />
              </div>

              {error && (
                <p className="flex items-start gap-1.5 text-xs text-destructive">
                  <AlertTriangle className="mt-0.5 size-3.5 shrink-0" /> {error}
                </p>
              )}
              {notice && (
                <p className="flex items-start gap-1.5 text-xs text-jade">
                  <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" /> {notice}
                </p>
              )}

              <button
                type="submit"
                disabled={busy}
                className="mt-1 flex items-center justify-center gap-2 rounded-full bg-gold px-4 py-2.5 text-sm font-semibold text-gold-foreground transition-all hover:brightness-105 active:translate-y-px disabled:opacity-60"
              >
                {busy && <Loader2 className="size-4 animate-spin" />}
                {mode === "signin" ? "Sign in" : "Create account"}
              </button>
            </form>

            <p className="mt-4 text-center text-xs text-muted-foreground">
              {mode === "signin" ? "New to Aura?" : "Already have an account?"}{" "}
              <button
                type="button"
                onClick={() => {
                  setMode(mode === "signin" ? "signup" : "signin");
                  setError(null);
                  setNotice(null);
                }}
                className={cn("font-semibold text-gold hover:underline")}
              >
                {mode === "signin" ? "Create an account" : "Sign in"}
              </button>
            </p>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z" />
    </svg>
  );
}
