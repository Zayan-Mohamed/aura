import { cn } from "@/lib/utils";

/** Aura's brand mark - a warm radiant bloom. Pure SVG, theme-aware. */
export function AuraMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden
      className={cn("text-gold", className)}
    >
      <circle cx="16" cy="16" r="5.5" fill="currentColor" />
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i * Math.PI) / 4;
        const x1 = 16 + Math.cos(a) * 9;
        const y1 = 16 + Math.sin(a) * 9;
        const x2 = 16 + Math.cos(a) * 13.5;
        const y2 = 16 + Math.sin(a) * 13.5;
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            opacity={0.85}
          />
        );
      })}
    </svg>
  );
}
