import { Badge } from "@/components/ui/badge";
import type { EventState } from "@/lib/events";
import { cn } from "@/lib/utils";

export function StateBadge({
  state,
  className,
}: {
  state: EventState;
  className?: string;
}) {
  const pulse =
    state.key === "STARTING_SOON" ? "animate-pulse-soft" : "";
  return (
    <Badge variant={state.variant} className={cn(pulse, className)}>
      {state.label}
    </Badge>
  );
}
