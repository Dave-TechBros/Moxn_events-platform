import { cn } from "@/lib/utils";

// Live capacity indicator. Color shifts to warning as it fills, error when sold out.
export function CapacityBar({
  remaining,
  total,
  soldOut,
  className,
}: {
  remaining: number;
  total: number;
  soldOut: boolean;
  className?: string;
}) {
  const pct = total > 0 ? Math.min(100, ((total - remaining) / total) * 100) : 0;
  const color = soldOut
    ? "bg-error"
    : pct >= 80
    ? "bg-warning"
    : pct >= 50
    ? "bg-info"
    : "bg-success";

  return (
    <div className={cn("w-full", className)}>
      <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {soldOut ? (
            <span className="font-semibold text-error">Sold out</span>
          ) : (
            <>
              <span className="font-semibold text-foreground">
                {remaining}
              </span>{" "}
              of {total} left
            </>
          )}
        </span>
        {!soldOut && pct >= 80 && (
          <span className="font-semibold text-warning">Selling fast</span>
        )}
      </div>
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Tickets remaining"
      >
        <div
          className={cn("h-full rounded-full transition-all", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
