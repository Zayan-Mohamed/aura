"use client";

import { OnbordaProvider, Onborda } from "onborda";
import { tours } from "@/lib/tours";
import { TourCard } from "./tour-card";

/**
 * Wraps the app in Onborda so any client component below can drive a guided tour
 * via `useOnborda()` (see the auto-start + "Take a tour" trigger in aura-chat).
 * Uses our own Aura-styled card, so no Onborda Tailwind content path is needed.
 */
export function TourProvider({ children }: { children: React.ReactNode }) {
  return (
    <OnbordaProvider>
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
