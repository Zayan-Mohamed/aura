"use client";

import * as React from "react";
import { useOnborda } from "onborda";

/**
 * Onborda centers its card on the target with no viewport collision detection, so
 * a step anchored to a right-edge control (the header icons) overflows off-screen
 * on mobile and forces a horizontal scroll.
 *
 * We keep the card inside the visible content box by nudging it with `margin-left`
 * — a property Onborda never sets itself (it writes transform/left/top/margin-top).
 * The write is idempotent: we derive the card's natural position by subtracting the
 * current margin, so re-running only settles it. Onborda positions the card over
 * several async ticks after a step change (and rewrites its style, wiping our
 * nudge), so we re-clamp on a short timer until it stabilises, then keep listeners
 * for later viewport changes.
 *
 * Renders nothing; must live inside <OnbordaProvider>.
 */
export function TourClamp() {
  const { isOnbordaVisible, currentStep, currentTour } = useOnborda();

  React.useEffect(() => {
    if (!isOnbordaVisible) return;

    const clamp = () => {
      const card = document.querySelector('[data-name="onborda-card"]');
      if (!(card instanceof HTMLElement)) return;

      const current = parseFloat(card.style.marginLeft) || 0;
      const r = card.getBoundingClientRect();
      // Natural (un-nudged) edges, so the math is stable across re-applies.
      const naturalLeft = r.left - current;
      const naturalRight = r.right - current;
      // The body rect already excludes the reserved scrollbar gutters — the true
      // safe area on every screen.
      const safe = document.body.getBoundingClientRect();
      const m = 8;

      let dx = 0;
      if (naturalRight > safe.right - m) dx = safe.right - m - naturalRight; // pull left to fit right edge
      if (naturalLeft + dx < safe.left + m) dx = safe.left + m - naturalLeft; // but never past the left edge

      const next = Math.abs(dx) > 0.5 ? `${Math.round(dx)}px` : "";
      if ((card.style.marginLeft || "") !== next) card.style.marginLeft = next;
    };

    // Re-clamp for a bit after a step change so we settle on Onborda's FINAL card
    // position (it repositions over a few async ticks). Idempotent, so this is cheap.
    let ticks = 0;
    let timer = 0;
    const run = () => {
      clamp();
      if (++ticks < 14) timer = window.setTimeout(run, 110); // ~1.5s of convergence
    };
    const raf = requestAnimationFrame(run);

    window.addEventListener("resize", clamp);
    window.addEventListener("scroll", clamp, true);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
      window.removeEventListener("resize", clamp);
      window.removeEventListener("scroll", clamp, true);
    };
  }, [isOnbordaVisible, currentStep, currentTour]);

  return null;
}
