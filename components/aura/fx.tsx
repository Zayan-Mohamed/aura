"use client";

/**
 * Shared motion primitives for the marketing pages (guide + tech). Keeps the
 * site feeling alive - an ambient drifting aurora, scroll-reveals, staggered
 * cascades, and a pulsing pipeline dot - all respecting prefers-reduced-motion.
 */
import * as React from "react";
import { motion, useReducedMotion, type Variants } from "motion/react";

const EASE = [0.22, 1, 0.36, 1] as const;

/** Slow-drifting blurred colour blobs behind the page - fixed, so they breathe as you scroll. */
export function AuroraBackground() {
  const reduce = useReducedMotion();
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="aura-radial absolute inset-x-0 top-0 h-[60vh]" />
      {!reduce && (
        <>
          <motion.div
            className="absolute -left-40 top-16 size-[30rem] rounded-full bg-gold/10 blur-3xl"
            animate={{ x: [0, 70, 0], y: [0, 40, 0], opacity: [0.45, 0.8, 0.45] }}
            transition={{ duration: 19, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute -right-40 top-1/3 size-[28rem] rounded-full bg-jade/10 blur-3xl"
            animate={{ x: [0, -60, 0], y: [0, 60, 0], opacity: [0.35, 0.7, 0.35] }}
            transition={{ duration: 23, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute -bottom-24 left-1/3 size-[26rem] rounded-full bg-rose/[0.07] blur-3xl"
            animate={{ x: [0, 50, 0], y: [0, -30, 0], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 27, repeat: Infinity, ease: "easeInOut" }}
          />
        </>
      )}
    </div>
  );
}

/** Fade + rise into view once. */
export function Reveal({
  children,
  delay = 0,
  y = 18,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? { opacity: 0 } : { opacity: 0, y }}
      whileInView={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.55, ease: EASE, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

const containerV: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};
const itemV: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};

/** Wrap a group so its <StaggerItem> children cascade in. */
export function Stagger({ children, className }: { children: React.ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      variants={containerV}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-60px" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** One cascading child. `lift` adds a hover float (for cards/nodes). */
export function StaggerItem({
  children,
  className,
  lift = false,
}: {
  children: React.ReactNode;
  className?: string;
  lift?: boolean;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      variants={itemV}
      whileHover={lift ? { y: -4 } : undefined}
      transition={{ type: "spring", stiffness: 320, damping: 24 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** A numbered dot with a soft outward pulse ring. */
export function PulseDot({ children, className }: { children: React.ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <span className={className}>
      {!reduce && (
        <motion.span
          aria-hidden
          className="absolute inset-0 rounded-full ring-2 ring-gold/40"
          animate={{ scale: [1, 1.6], opacity: [0.5, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut" }}
        />
      )}
      <span className="relative">{children}</span>
    </span>
  );
}

/** A connector arrow that gently flows in its travel direction. */
export function FlowArrow({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();
  if (reduce) return <>{children}</>;
  return (
    <motion.div
      aria-hidden
      animate={{ opacity: [0.35, 1, 0.35] }}
      transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
      className="flex items-center justify-center"
    >
      {children}
    </motion.div>
  );
}
