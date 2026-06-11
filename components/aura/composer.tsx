"use client";

import * as React from "react";
import { ArrowUp, Square } from "lucide-react";
import { cn } from "@/lib/utils";

export function Composer({
  onSend,
  onStop,
  busy,
  placeholder = "Ask Aura anything — groceries, gadgets, a gift…",
}: {
  onSend: (text: string) => void;
  onStop?: () => void;
  busy?: boolean;
  placeholder?: string;
}) {
  const [value, setValue] = React.useState("");
  const ref = React.useRef<HTMLTextAreaElement>(null);

  const grow = React.useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, []);

  React.useEffect(grow, [value, grow]);

  function submit() {
    const text = value.trim();
    if (!text || busy) return;
    onSend(text);
    setValue("");
  }

  return (
    <div className="glass rounded-[1.6rem] border border-border p-1.5 shadow-[0_10px_40px_-24px_rgb(0_0_0/0.5)] transition-shadow focus-within:border-gold/40 focus-within:shadow-[0_14px_44px_-22px_rgb(0_0_0/0.45)]">
      <div className="flex items-end gap-2">
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
          placeholder={placeholder}
          aria-label="Message Aura"
          className="aura-scroll max-h-40 flex-1 resize-none bg-transparent px-3.5 py-2.5 text-[0.95rem] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/70"
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
            disabled={!value.trim()}
            aria-label="Send"
            className={cn(
              "grid size-10 shrink-0 place-items-center rounded-full transition-all active:translate-y-px",
              value.trim()
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
