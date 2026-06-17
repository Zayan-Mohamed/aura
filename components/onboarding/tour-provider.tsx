"use client";

import * as React from "react";
import { OnbordaProvider, Onborda } from "onborda";
import { tours } from "@/lib/tours";
import { TourCard } from "./tour-card";
import { TourClamp } from "./tour-clamp";

/**
 * Wraps the app in Onborda so any client component below can drive a guided tour
 * via `useOnborda()` (see the auto-start + "Take a tour" trigger in aura-chat).
 * Uses our own Aura-styled card, so no Onborda Tailwind content path is needed.
 */
export function TourProvider({ children }: { children: React.ReactNode }) {
  // Our `html` reserves a scrollbar gutter on both edges, insetting <body> by the
  // gutter width. Onborda highlights from viewport-relative rects but renders inside
  // that inset body, so expose the exact left inset for the overlay to cancel out
  // (see the [data-name="onborda-overlay"] rule in globals.css).
  React.useEffect(() => {
    const sync = () => {
      const left = document.body.getBoundingClientRect().left;
      document.documentElement.style.setProperty("--onborda-x-fix", `${left}px`);
    };
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);

  return (
    <OnbordaProvider>
      <TourClamp />
      <Onborda
        steps={tours}
        cardComponent={TourCard}
        shadowRgb="20,18,15"
        shadowOpacity="0.55"
      >
        {children}
      </Onborda>
    </OnbordaProvider>
  );
}
