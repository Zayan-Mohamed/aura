import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("aura-shimmer rounded-md bg-muted/70", className)}
      {...props}
    />
  );
}

export { Skeleton };
