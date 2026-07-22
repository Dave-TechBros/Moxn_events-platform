"use client";

import * as React from "react";
import Link from "next/link";
import { MapPin, CalendarDays, ArrowRight } from "lucide-react";
import type { SerializedEvent } from "@/lib/events";
import { formatEventLocal, formatViewerLocal, viewerTimeZone } from "@/lib/tz";
import { formatMoney } from "@/lib/events";
import { StateBadge } from "@/components/state-badge";
import { CategoryTag } from "@/components/category-tag";
import { CapacityBar } from "@/components/capacity-bar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function EventCard({
  event,
  className,
}: {
  event: SerializedEvent;
  className?: string;
}) {
  const [viewerTz, setViewerTz] = React.useState<string | null>(null);
  React.useEffect(() => {
    setViewerTz(viewerTimeZone());
  }, []);

  const start = new Date(event.startTime);
  const priceLabel =
    event.minPrice === 0 ? "Free" : `From ${formatMoney(event.minPrice)}`;

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm transition-shadow hover:shadow-md focus-within:shadow-md",
        className
      )}
    >
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted">
        {event.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.coverImage}
            alt={`Cover image for ${event.title}`}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-muted-foreground">
            No image
          </div>
        )}
        <div className="absolute left-3 top-3">
          <CategoryTag name={event.category.name} color={event.category.color} />
        </div>
        <div className="absolute right-3 top-3">
          <StateBadge state={event.state} />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarDays className="h-4 w-4 shrink-0" />
          <span className="font-medium text-foreground">
            {formatEventLocal(start, event.timezone)}
          </span>
        </div>
        {viewerTz && viewerTz !== event.timezone && (
          <p className="text-xs text-muted-foreground">
            Your time: {formatViewerLocal(start, viewerTz)}
          </p>
        )}

        <h3 className="text-lg font-semibold leading-tight tracking-tight">
          <Link
            href={`/events/${event.id}`}
            className="outline-none after:absolute after:inset-0"
          >
            {event.title}
          </Link>
        </h3>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4 shrink-0" />
          <span className="truncate">{event.venueName}</span>
        </div>

        <CapacityBar
          remaining={event.availability.overallRemaining}
          total={event.availability.totalCapacity}
          soldOut={event.availability.soldOut}
        />

        <div className="relative z-10 mt-auto flex items-center justify-between pt-2">
          <span
            className={cn(
              "text-base font-bold",
              event.minPrice === 0 ? "text-success" : "text-foreground"
            )}
          >
            {priceLabel}
          </span>
          <Button asChild size="sm" className="tap-target">
            <Link href={`/events/${event.id}`}>
              {event.availability.soldOut ? "View" : "Get tickets"}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}
