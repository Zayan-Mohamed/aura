"use client";

import * as React from "react";
import { motion } from "motion/react";
import { Check, Send } from "lucide-react";
import { cn } from "@/lib/utils";

export type ChoiceOption = { label: string; value?: string };
export type ChoiceData = {
  question: string;
  options: ChoiceOption[];
  multiSelect?: boolean;
  note?: string;
};

/**
 * A model-asked question rendered as tappable buttons (from the `askChoice`
 * tool). Single-select sends the moment a chip is tapped; multi-select toggles
 * chips and sends the combined answer on "Send". Once answered the card locks so
 * stale questions can't be re-answered.
 *
 * Presentational + local-state only (no effects) to satisfy the React Compiler
 * lint rules in this repo.
 */
export function ChoicePrompt({
  data,
  onAsk,
}: {
  data: ChoiceData;
  onAsk?: (text: string) => void;
}) {
  const { question, options, multiSelect, note } = data;
  const [answered, setAnswered] = React.useState(false);
  // Multi-select working set (indices). Unused for single-select.
  const [picked, setPicked] = React.useState<number[]>([]);

  const send = (text: string) => {
    if (answered || !text.trim()) return;
    setAnswered(true);
    onAsk?.(text);
  };

  const choose = (opt: ChoiceOption) => send(opt.value || opt.label);

  const toggle = (i: number) =>
    setPicked((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]));

  const sendMulti = () => {
    if (!picked.length) return;
    const chosen = picked.map((i) => options[i].value || options[i].label);
    send(`Let's go with: ${chosen.join(", ")}.`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="w-full max-w-md rounded-2xl border border-border bg-card p-4 shadow-sm ring-1 ring-border/60"
    >
      <p className="text-[0.95rem] font-medium leading-snug text-card-foreground">{question}</p>
      {note && <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{note}</p>}

      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((opt, i) => {
          const isPicked = multiSelect && picked.includes(i);
          return (
            <button
              key={`${opt.label}-${i}`}
              type="button"
              disabled={answered}
              onClick={() => (multiSelect ? toggle(i) : choose(opt))}
              aria-pressed={multiSelect ? isPicked : undefined}
              className={cn(
                "inline-flex min-w-[7rem] flex-1 items-center justify-center gap-1.5 rounded-xl border px-3.5 py-2.5 text-sm font-medium transition-colors",
                "disabled:cursor-not-allowed",
                isPicked
                  ? "border-gold/50 bg-gold/12 text-foreground"
                  : "border-border bg-background text-card-foreground hover:border-gold/40 hover:bg-gold/5",
                answered && !isPicked && "opacity-50",
              )}
            >
              {isPicked && <Check className="size-3.5 text-gold" />}
              {opt.label}
            </button>
          );
        })}
      </div>

      {multiSelect && !answered && (
        <button
          type="button"
          onClick={sendMulti}
          disabled={!picked.length}
          className={cn(
            "mt-3 flex w-full items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-semibold tracking-wide transition-all",
            picked.length
              ? "bg-gold text-gold-foreground hover:brightness-105 active:translate-y-px"
              : "cursor-not-allowed bg-muted text-muted-foreground",
          )}
        >
          <Send className="size-3.5" />
          {picked.length ? `Send ${picked.length} ` : "Pick at least one"}
        </button>
      )}

      {answered && (
        <p className="mt-2.5 inline-flex items-center gap-1 text-xs text-jade">
          <Check className="size-3.5" /> Sent
        </p>
      )}
    </motion.div>
  );
}
