"use client";

import * as React from "react";
import { ArrowUp, Square, ImagePlus, X, Loader2, Mic } from "lucide-react";
import { fileToDataUrl } from "@/lib/image";
import { useDictation } from "@/lib/use-dictation";
import type { ShopperLanguage } from "@/lib/use-profile";
import { cn } from "@/lib/utils";

export function Composer({
  onSend,
  onStop,
  busy,
  placeholder = "Ask Aura anything...",
  allowImage = true,
  imageEnabled = true,
  onRequireAuth,
  language = "auto",
}: {
  onSend: (text: string, imageDataUrl?: string) => void;
  onStop?: () => void;
  busy?: boolean;
  placeholder?: string;
  /** Show the photo-upload icon at all (master feature flag). */
  allowImage?: boolean;
  /** Icon is active. When false (e.g. guest), it shows locked with a tooltip. */
  imageEnabled?: boolean;
  /** Called when a locked icon is clicked (prompt the shopper to sign in). */
  onRequireAuth?: () => void;
  /** Shopper's preferred language - biases the speech-to-text transcription. */
  language?: ShopperLanguage;
}) {
  const [value, setValue] = React.useState("");
  const [image, setImage] = React.useState<string | null>(null);
  const [loadingImg, setLoadingImg] = React.useState(false);
  const ref = React.useRef<HTMLTextAreaElement>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  // Voice dictation (Groq Whisper). Transcribed text is appended to the input
  // for the shopper to review/edit before sending - never auto-sent.
  const dictation = useDictation(language);
  const appendTranscript = React.useCallback((text: string) => {
    setValue((v) => (v.trim() ? `${v.trim()} ${text}` : text));
    ref.current?.focus();
  }, []);
  const toggleMic = () => {
    if (dictation.state === "recording") void dictation.stop(appendTranscript);
    else void dictation.start();
  };

  const grow = React.useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, []);

  React.useEffect(grow, [value, grow]);

  async function pickImage(file: File) {
    setLoadingImg(true);
    try {
      setImage(await fileToDataUrl(file));
    } catch {
      /* unreadable image - silently ignore */
    } finally {
      setLoadingImg(false);
    }
  }

  function submit() {
    const text = value.trim();
    if ((!text && !image) || busy) return;
    onSend(text, image ?? undefined);
    setValue("");
    setImage(null);
  }

  const canSend = (Boolean(value.trim()) || Boolean(image)) && !loadingImg;

  return (
    <div className="rounded-[1.6rem] border border-border bg-background/95 backdrop-blur-xl backdrop-saturate-150 supports-[backdrop-filter]:bg-background/85 p-1.5 shadow-[0_10px_40px_-24px_rgb(0_0_0/0.5)] transition-shadow focus-within:border-gold/40 focus-within:shadow-[0_14px_44px_-22px_rgb(0_0_0/0.45)]">
      {/* Dictation error (mic blocked / transcription failed) */}
      {dictation.error && (
        <button
          type="button"
          onClick={dictation.clearError}
          className="mb-1 flex w-full items-center gap-1.5 rounded-xl bg-rose/10 px-3 py-1.5 text-left text-xs text-rose"
        >
          <X className="size-3.5 shrink-0" />
          {dictation.error}
        </button>
      )}

      {/* Attached-image preview */}
      {allowImage && imageEnabled && image && (
        <div className="flex items-center gap-2 px-2 pb-1.5 pt-1">
          <div className="relative size-14 overflow-hidden rounded-xl ring-1 ring-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image} alt="Attached" className="size-full object-cover" />
            <button
              type="button"
              aria-label="Remove image"
              onClick={() => setImage(null)}
              className="absolute right-0.5 top-0.5 grid size-5 place-items-center rounded-full bg-foreground/70 text-background transition-colors hover:bg-foreground"
            >
              <X className="size-3" />
            </button>
          </div>
          <span className="text-xs text-muted-foreground">
            I&rsquo;ll find the closest visual matches.
          </span>
        </div>
      )}

      <div className="flex items-end gap-2">
        {allowImage && imageEnabled && (
          <>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void pickImage(f);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              aria-label="Attach a photo"
              onClick={() => fileRef.current?.click()}
              disabled={busy || loadingImg}
              className="grid size-10 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
            >
              {loadingImg ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <ImagePlus className="size-5" />
              )}
            </button>
          </>
        )}

        {/* Guest: icon shown but locked, with a sign-in tooltip. */}
        {allowImage && !imageEnabled && (
          <div className="group/lock relative shrink-0">
            <button
              type="button"
              aria-label="Sign in to search by photo"
              aria-disabled
              onClick={onRequireAuth}
              className="grid size-10 place-items-center rounded-full text-muted-foreground/45 transition-colors hover:text-muted-foreground"
            >
              <ImagePlus className="size-5" />
            </button>
            <span
              role="tooltip"
              className="pointer-events-none absolute bottom-full left-0 mb-2 w-max max-w-[14rem] rounded-lg bg-foreground px-2.5 py-1.5 text-xs font-medium text-background opacity-0 shadow-md transition-opacity duration-150 group-hover/lock:opacity-100 group-focus-within/lock:opacity-100"
            >
              Sign in to search by photo
            </span>
          </div>
        )}

        {/* Voice dictation - push to talk, then review the transcript */}
        {dictation.supported && (
          <button
            type="button"
            onClick={toggleMic}
            disabled={busy || dictation.state === "transcribing"}
            aria-label={dictation.state === "recording" ? "Stop recording" : "Speak to Aura"}
            aria-pressed={dictation.state === "recording"}
            className={cn(
              "grid size-10 shrink-0 place-items-center rounded-full transition-colors disabled:opacity-50",
              dictation.state === "recording"
                ? "bg-rose/15 text-rose"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {dictation.state === "transcribing" ? (
              <Loader2 className="size-5 animate-spin" />
            ) : dictation.state === "recording" ? (
              <span className="relative grid place-items-center">
                <span className="absolute size-5 animate-ping rounded-full bg-rose/40" />
                <Mic className="size-5" />
              </span>
            ) : (
              <Mic className="size-5" />
            )}
          </button>
        )}

        <textarea
          ref={ref}
          rows={1}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={
            dictation.state === "recording"
              ? "Listening… tap the mic to stop"
              : dictation.state === "transcribing"
                ? "Transcribing…"
                : image
                  ? "Add a note (optional)…"
                  : placeholder
          }
          aria-label="Message Aura"
          className="aura-scroll max-h-40 flex-1 resize-none bg-transparent px-1.5 py-2.5 text-[0.95rem] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/70"
        />
        {busy ? (
          <button
            type="button"
            onClick={onStop}
            aria-label="Stop"
            className="grid size-10 shrink-0 place-items-center rounded-full bg-muted text-foreground transition-colors hover:bg-muted/70"
          >
            <Square className="size-4 fill-current" />
          </button>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={!canSend}
            aria-label="Send"
            className={cn(
              "grid size-10 shrink-0 place-items-center rounded-full transition-all active:translate-y-px",
              canSend
                ? "bg-gold text-gold-foreground hover:brightness-105"
                : "bg-muted text-muted-foreground",
            )}
          >
            <ArrowUp className="size-5" />
          </button>
        )}
      </div>
    </div>
  );
}
