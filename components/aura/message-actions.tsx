"use client";

import * as React from "react";
import { Copy, Check, Volume2, Square, RefreshCw } from "lucide-react";
import { useSpeech } from "@/lib/use-speech";
import { cn } from "@/lib/utils";

/**
 * Hover/visible action row under an assistant reply: copy the text, read it
 * aloud (browser speech synthesis, language-aware), and optionally regenerate.
 * Quiet by default — these are conveniences, not the main event.
 */
export function MessageActions({
  text,
  onRegenerate,
}: {
  text: string;
  onRegenerate?: () => void;
}) {
  const { speak, speaking, supported: ttsSupported } = useSpeech();
  const [copied, setCopied] = React.useState(false);

  const clean = text.trim();
  if (!clean) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(clean);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — ignore */
    }
  };

  const btn =
    "grid size-7 place-items-center rounded-full text-muted-foreground/70 transition-colors hover:bg-muted hover:text-foreground";

  return (
    <div className="-mt-1 flex items-center gap-0.5">
      <button type="button" onClick={copy} aria-label="Copy reply" className={btn}>
        {copied ? <Check className="size-3.5 text-jade" /> : <Copy className="size-3.5" />}
      </button>

      {ttsSupported && (
        <button
          type="button"
          onClick={() => speak(clean)}
          aria-label={speaking ? "Stop reading" : "Read aloud"}
          aria-pressed={speaking}
          className={cn(btn, speaking && "text-gold hover:text-gold")}
        >
          {speaking ? <Square className="size-3.5 fill-current" /> : <Volume2 className="size-3.5" />}
        </button>
      )}

      {onRegenerate && (
        <button type="button" onClick={onRegenerate} aria-label="Regenerate reply" className={btn}>
          <RefreshCw className="size-3.5" />
        </button>
      )}
    </div>
  );
}
