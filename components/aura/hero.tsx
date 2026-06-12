"use client";

import { motion } from "motion/react";
import { ShoppingBasket, Smartphone, Cake, Truck, MessageCircleHeart } from "lucide-react";
import { AuraMark } from "./aura-mark";

const SUGGESTIONS = [
  { icon: ShoppingBasket, label: "Stock up my weekly groceries", text: "Help me stock up on weekly groceries — rice, dhal, tea, and a few essentials." },
  { icon: Smartphone, label: "A good phone under Rs 80,000", text: "I'm looking for a good smartphone under Rs 80,000." },
  { icon: Truck, label: "What reaches Kandy by Saturday?", text: "What can you deliver to Kandy by Saturday?" },
  { icon: Cake, label: "Birthday cake to Colombo tomorrow", text: "I'd like a birthday cake delivered to Colombo tomorrow." },
  { icon: MessageCircleHeart, label: "Mata gift ekak ganna ona", text: "Mata yaaluwekuta gift ekak ganna ona, Rs 5000 vage budget ekak." },
];

export function Hero({ onAsk }: { onAsk: (text: string) => void }) {
  return (
    <div className="relative mx-auto flex min-h-full max-w-full flex-col items-center justify-center px-2 pb-28 pt-10 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.8, rotate: -8 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 18 }}
        className="grid size-16 place-items-center rounded-2xl bg-card shadow-sm ring-1 ring-border"
      >
        <AuraMark className="size-9" />
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08, duration: 0.5 }}
        className="font-heading mt-6 text-balance text-4xl leading-[1.05] tracking-tight text-foreground sm:text-5xl"
      >
        Sri Lanka, beautifully shopped.
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.16, duration: 0.5 }}
        className="mt-4 max-w-md text-pretty text-base leading-relaxed text-muted-foreground"
      >
        I’m Aura, your shopping concierge for Kapruka. Groceries, gadgets, a
        gift for someone special. Tell me what you need and where it’s going,
        and I’ll make sure it actually gets there.
      </motion.p>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.28, duration: 0.5 }}
        className="mt-8 flex flex-wrap items-center justify-center gap-2"
      >
        {SUGGESTIONS.map((s, i) => (
          <motion.button
            key={s.label}
            type="button"
            onClick={() => onAsk(s.text)}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.05 }}
            whileHover={{ y: -2 }}
            className="group inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3.5 py-2 text-sm text-card-foreground transition-colors hover:border-gold/40 hover:bg-gold/5"
          >
            <s.icon className="size-3.5 text-gold" />
            {s.label}
          </motion.button>
        ))}
      </motion.div>
    </div>
  );
}
