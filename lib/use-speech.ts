"use client";

/**
 * Read-aloud via the browser's built-in SpeechSynthesis — zero cost, zero keys,
 * and (where the OS ships the voice) it speaks Sinhala/Tamil too. We pick a
 * voice matching the text's detected language so Aura's reply is read in the
 * right accent when possible, falling back to the platform default otherwise.
 *
 * SpeechSynthesis has three well-known footguns we handle here:
 *  1. getVoices() is empty on first call — voices load async; we listen for
 *     `voiceschanged` and cache them.
 *  2. Chrome garbage-collects the utterance mid-speech unless a reference is
 *     held — we keep one in a ref.
 *  3. Forcing `lang` to a tag with no installed voice (e.g. si-LK on desktop)
 *     can make Chrome speak NOTHING — so we only set a voice/lang we actually
 *     resolved, and otherwise let the platform default speak the text.
 */
import * as React from "react";
import { detectLanguage, type DetectedLanguage } from "./detect-language";

// Detected dialect → BCP-47 language tags to try, best first. Romanized dialects
// map to their underlying language's voice (it reads the closest it can), then
// fall back to English so there's always *some* voice rather than silence.
const VOICE_LANGS: Record<DetectedLanguage, string[]> = {
  english: ["en-US", "en-GB", "en"],
  sinhala: ["si-LK", "si", "en"],
  tamil: ["ta-IN", "ta-LK", "ta", "en"],
  singlish: ["si-LK", "si", "en"],
  tanglish: ["ta-IN", "ta", "en"],
};

// Module-level voice cache, kept fresh via `voiceschanged`. getVoices() is empty
// until the engine finishes loading them, so we can't rely on a single call.
let voiceCache: SpeechSynthesisVoice[] = [];
function refreshVoices() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const v = window.speechSynthesis.getVoices();
  if (v.length) voiceCache = v;
}
if (typeof window !== "undefined" && "speechSynthesis" in window) {
  refreshVoices();
  window.speechSynthesis.addEventListener?.("voiceschanged", refreshVoices);
}

/** Best matching voice for the text, or null to use the platform default. */
function pickVoice(text: string): SpeechSynthesisVoice | null {
  if (!voiceCache.length) refreshVoices();
  const langs = VOICE_LANGS[detectLanguage(text)];
  for (const tag of langs) {
    const matches = voiceCache.filter((x) => x.lang?.toLowerCase().startsWith(tag.toLowerCase()));
    if (matches.length) {
      // Prefer an OFFLINE/local voice — Chrome's "Google" network voices are
      // unreliable on Linux (they're listed but often produce no audio).
      return matches.find((v) => v.localService) ?? matches[0];
    }
  }
  // No language match — fall back to a local default voice so it still speaks
  // (better than forcing a lang with no voice, or a dead network voice).
  return (
    voiceCache.find((v) => v.localService && v.default) ??
    voiceCache.find((v) => v.localService) ??
    voiceCache.find((v) => v.default) ??
    voiceCache[0] ??
    null
  );
}

export function useSpeech() {
  const [speaking, setSpeaking] = React.useState(false);
  // Only known on the client — gate behind mount to avoid hydration mismatch.
  const [mounted, setMounted] = React.useState(false);
  // Hold the active utterance so Chrome doesn't GC it mid-sentence.
  const utterRef = React.useRef<SpeechSynthesisUtterance | null>(null);
  // Heartbeat: Chrome silently pauses synthesis after ~15s; resume() keeps it alive.
  const keepAliveRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  const supported =
    mounted &&
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    "SpeechSynthesisUtterance" in window;

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    refreshVoices(); // nudge the engine to populate voices on first mount
  }, []);

  const clearKeepAlive = React.useCallback(() => {
    if (keepAliveRef.current) {
      clearInterval(keepAliveRef.current);
      keepAliveRef.current = null;
    }
  }, []);

  // Cancel any in-flight speech on unmount so navigating away goes quiet.
  React.useEffect(() => {
    return () => {
      clearKeepAlive();
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [clearKeepAlive]);

  const stop = React.useCallback(() => {
    if (!supported) return;
    clearKeepAlive();
    window.speechSynthesis.cancel();
    utterRef.current = null;
    setSpeaking(false);
  }, [supported, clearKeepAlive]);

  const speak = React.useCallback(
    (text: string) => {
      if (!supported || !text.trim()) return;
      const synth = window.speechSynthesis;

      // Toggle off if something is already speaking.
      if (synth.speaking || synth.pending) {
        clearKeepAlive();
        synth.cancel();
        utterRef.current = null;
        setSpeaking(false);
        return;
      }

      // Strip emojis/symbols so TTS doesn't read out "broken heart"; the visible
      // message keeps them, only the spoken version is cleaned.
      const spoken = text
        .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]/gu, "")
        .replace(/\s{2,}/g, " ")
        .trim();
      if (!spoken) return;

      const u = new SpeechSynthesisUtterance(spoken);
      const voice = pickVoice(text);
      if (voice) {
        u.voice = voice;
        u.lang = voice.lang;
      }
      u.rate = 1;
      u.pitch = 1;
      u.volume = 1;
      u.onstart = () => setSpeaking(true);
      u.onend = () => {
        clearKeepAlive();
        utterRef.current = null;
        setSpeaking(false);
      };
      u.onerror = () => {
        clearKeepAlive();
        utterRef.current = null;
        setSpeaking(false);
      };
      utterRef.current = u; // keep a reference (Chrome GC workaround)
      setSpeaking(true);
      // Call speak() SYNCHRONOUSLY inside the click gesture (deferring it can make
      // Chrome refuse to play), and start the resume() heartbeat for long replies.
      synth.speak(u);
      keepAliveRef.current = setInterval(() => {
        if (synth.speaking) synth.resume();
        else clearKeepAlive();
      }, 8000);
    },
    [supported, clearKeepAlive],
  );

  return { speak, stop, speaking, supported };
}
