"use client";

import { motion } from "motion/react";
import type { QuickReply } from "@/lib/quick-replies";

/** Tappable follow-up chips under the latest assistant reply. */
export function QuickReplies({
  replies,
  onAsk,
}: {
  replies: QuickReply[];
  onAsk: (text: string) => void;
}) {
  if (replies.length === 0) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="ml-11 flex flex-wrap gap-2"
    >
      {replies.map((r) => (
        <button
          key={r.label}
          type="button"
          onClick={() => onAsk(r.text)}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/70 px-3 py-1.5 text-xs font-medium text-card-foreground transition-colors hover:border-gold/40 hover:bg-gold/5"
        >
          {r.label}
        </button>
      ))}
    </motion.div>
  );
}
