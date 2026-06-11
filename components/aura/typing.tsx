"use client";

import { motion } from "motion/react";

export function TypingIndicator() {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full bg-muted/70 px-3 py-2">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="size-1.5 rounded-full bg-muted-foreground"
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </div>
  );
}
