"use client";

import type { CardComponentProps } from "onborda";
import { useOnborda } from "onborda";
import { X, ArrowLeft, ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Aura-styled tour tooltip for Onborda. Receives the current step + navigation
 * callbacks; `arrow` is the pointer SVG Onborda positions toward the target.
 * Purely presentational - closing/advancing is handled by Onborda's callbacks.
 */
export function TourCard({
  step,
  currentStep,
  totalSteps,
  nextStep,
  prevStep,
}: CardComponentProps) {
  const { closeOnborda } = useOnborda();
  const isFirst = currentStep === 0;
  const isLast = currentStep + 1 >= totalSteps;

  return (
    <div className="relative w-[min(20rem,calc(100vw-2rem))] rounded-2xl border border-gold/30 bg-background p-4 shadow-[0_24px_60px_-30px_rgb(0_0_0/0.6)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          {step.icon ? <span className="text-lg leading-none">{step.icon}</span> : null}
          <h3 className="font-heading text-lg leading-tight text-foreground">{step.title}</h3>
        </div>
        <button
          type="button"
          onClick={() => closeOnborda()}
          aria-label="Skip tour"
          className="grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{step.content}</div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5" aria-hidden>
          {Array.from({ length: totalSteps }).map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === currentStep ? "w-4 bg-gold" : "w-1.5 bg-border",
              )}
            />
          ))}
        </div>

        <div className="flex items-center gap-2">
          {!isFirst && (
            <button
              type="button"
              onClick={() => prevStep()}
              className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ArrowLeft className="size-3.5" /> Back
            </button>
          )}
          <button
            type="button"
            onClick={() => (isLast ? closeOnborda() : nextStep())}
            className="inline-flex items-center gap-1.5 rounded-full bg-gold px-3.5 py-1.5 text-xs font-semibold tracking-wide text-gold-foreground transition-all hover:brightness-105 active:translate-y-px"
          >
            {isLast ? (
              <>
                <Check className="size-3.5" /> Done
              </>
            ) : (
              <>
                Next <ArrowRight className="size-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
