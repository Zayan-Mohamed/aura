"use client";

import * as React from "react";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Kapruka images come from arbitrary external hosts and are cached up to 30
 * min, so we render a plain <img> with a reserved aspect box (no CLS), a
 * shimmer while loading, and a graceful fallback on error.
 */
export function ProductImage({
  src,
  alt,
  className,
  imgClassName,
}: {
  src?: string;
  alt: string;
  className?: string;
  imgClassName?: string;
}) {
  const [status, setStatus] = React.useState<"loading" | "ok" | "error">(
    src ? "loading" : "error",
  );

  return (
    <div className={cn("relative overflow-hidden bg-muted/60", className)}>
      {status === "loading" && <div className="absolute inset-0 aura-shimmer" />}
      {status === "error" ? (
        <div className="absolute inset-0 grid place-items-center text-muted-foreground/60">
          <ImageOff className="size-6" aria-hidden />
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={() => setStatus("ok")}
          onError={() => setStatus("error")}
          className={cn(
            "h-full w-full object-cover transition-all duration-700 ease-out",
            status === "ok" ? "scale-100 opacity-100 blur-0" : "scale-105 opacity-0 blur-md",
            imgClassName,
          )}
        />
      )}
    </div>
  );
}
