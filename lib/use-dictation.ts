"use client";

/**
 * Push-to-talk dictation hook. Records a short clip with MediaRecorder, then
 * uploads it to /api/transcribe (Groq Whisper) and returns the text so the
 * composer can drop it into the input for the shopper to review/edit.
 *
 * State machine: idle → recording → transcribing → idle. Errors surface as a
 * one-shot message and reset to idle. SSR-safe: `supported` is only true once
 * the browser exposes mic capture.
 */
import * as React from "react";
import type { ShopperLanguage } from "./use-profile";

export type DictationState = "idle" | "recording" | "transcribing";

// Whisper language hints (ISO-639-1). Singlish ≈ romanized Sinhala, Tanglish ≈
// romanized Tamil - bias Whisper toward the underlying language; the shopper can
// always edit the transcript. "auto" sends no hint (let Whisper detect).
const LANG_HINT: Record<ShopperLanguage, string | undefined> = {
  auto: undefined,
  english: "en",
  sinhala: "si",
  singlish: "si",
  tanglish: "ta",
};

function bestMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  for (const t of ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"]) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return undefined;
}

export function useDictation(language: ShopperLanguage = "auto") {
  const [state, setState] = React.useState<DictationState>("idle");
  const [error, setError] = React.useState<string | null>(null);
  // Capability is only known on the client. Start false (matching SSR) and flip
  // after mount so the mic button's presence never causes a hydration mismatch.
  const [mounted, setMounted] = React.useState(false);
  const recorderRef = React.useRef<MediaRecorder | null>(null);
  const chunksRef = React.useRef<Blob[]>([]);
  const streamRef = React.useRef<MediaStream | null>(null);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const supported =
    mounted &&
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== "undefined";

  const cleanup = React.useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recorderRef.current = null;
    chunksRef.current = [];
  }, []);

  React.useEffect(() => cleanup, [cleanup]);

  const start = React.useCallback(async () => {
    if (!supported || state !== "idle") return;
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = bestMimeType();
      const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorderRef.current = rec;
      rec.start();
      setState("recording");
    } catch {
      cleanup();
      setError("I couldn't reach your mic. Check the browser permission and try again.");
      setState("idle");
    }
  }, [supported, state, cleanup]);

  /** Stop recording and resolve to the transcript ("" if nothing usable). */
  const stop = React.useCallback(async (onText: (text: string) => void) => {
    const rec = recorderRef.current;
    if (!rec || state !== "recording") return;

    const blob: Blob = await new Promise((resolve) => {
      rec.onstop = () =>
        resolve(new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" }));
      rec.stop();
    });
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    if (blob.size < 1200) {
      // Too short to be speech - treat as a cancelled tap, no error.
      setState("idle");
      return;
    }

    setState("transcribing");
    try {
      const form = new FormData();
      form.append("audio", blob, "speech.webm");
      const hint = LANG_HINT[language];
      if (hint) form.append("language", hint);
      const res = await fetch("/api/transcribe", { method: "POST", body: form });
      const data = (await res.json().catch(() => ({}))) as { text?: string; error?: string };
      if (!res.ok || data.error) {
        setError(data.error ?? "Voice input didn't work. Please type it instead.");
      } else if (data.text) {
        onText(data.text);
      }
    } catch {
      setError("Voice input didn't work. Please type it instead.");
    } finally {
      setState("idle");
      cleanup();
    }
  }, [state, language, cleanup]);

  /** Abort without transcribing (e.g. unmount or user cancel). */
  const cancel = React.useCallback(() => {
    try {
      recorderRef.current?.stop();
    } catch {
      /* ignore */
    }
    cleanup();
    setState("idle");
  }, [cleanup]);

  return { state, error, supported, start, stop, cancel, clearError: () => setError(null) };
}
