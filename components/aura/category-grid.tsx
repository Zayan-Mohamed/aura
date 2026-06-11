"use client";

import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import type { Category } from "@/lib/kapruka";
import { prettyLabel } from "@/lib/format";

// A few evocative categories worth surfacing first for an undecided shopper.
const HERO = new Set([
  "flowers",
  "cakes",
  "Chocolates",
  "Jewellery",
  "Perfumes",
  "birthday",
  "anniversary",
  "wedding",
  "Books",
  "uniquegifts",
  "Personalized Gifts",
  "bestsellers",
]);

export function CategoryGrid({
  categories,
  onAsk,
}: {
  categories: Category[];
  onAsk?: (text: string) => void;
}) {
  const ranked = [...categories].sort(
    (a, b) => Number(HERO.has(b.name)) - Number(HERO.has(a.name)),
  );
  const shown = ranked.slice(0, 12);

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
      {shown.map((c, i) => (
        <motion.button
          key={c.name}
          type="button"
          onClick={() => onAsk?.(`Show me some ${prettyLabel(c.name)} gifts.`)}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: Math.min(i * 0.03, 0.25), duration: 0.3 }}
          whileHover={{ y: -2 }}
          className="group flex items-center justify-between gap-2 rounded-xl border border-border bg-card px-3.5 py-3 text-left transition-colors hover:border-gold/40 hover:bg-gold/5"
        >
          <span className="text-sm font-medium text-card-foreground">
            {prettyLabel(c.name)}
          </span>
          <ArrowRight className="size-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-gold" />
        </motion.button>
      ))}
    </div>
  );
}
