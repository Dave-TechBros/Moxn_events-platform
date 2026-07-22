"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { EventCard } from "@/components/event-card";
import { EventGridSkeleton } from "@/components/skeletons";
import { EmptyState } from "@/components/empty-state";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { SerializedEvent } from "@/lib/events";
import type { Category } from "@prisma/client";

export function EventsBrowser({ initialCategories }: { initialCategories: Category[] }) {
  const [events, setEvents] = React.useState<SerializedEvent[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [q, setQ] = React.useState("");
  const [category, setCategory] = React.useState("all");
  const [when, setWhen] = React.useState("upcoming");
  const searchTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const doFetch = React.useCallback((queryQ: string, queryCat: string, queryWhen: string) => {
    let cancelled = false;
    const query = new URLSearchParams();
    if (queryQ) query.set("q", queryQ);
    if (queryCat !== "all") query.set("category", queryCat);
    const controller = new AbortController();
    fetch(`/api/events?${query.toString()}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d.events) {
          let list = d.events as SerializedEvent[];
          const now = Date.now();
          list = list.sort(
            (a, b) =>
              new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
          );
          if (queryWhen === "upcoming") {
            list = list.filter(
              (e) => new Date(e.endTime).getTime() >= now
            );
          } else if (queryWhen === "past") {
            list = list.filter((e) => new Date(e.endTime).getTime() < now);
          }
          setEvents(list);
        } else {
          setError("Could not load events.");
        }
      })
      .catch(() => { if (!cancelled) setError("Network error. Please try again."); });
    return () => { cancelled = true; controller.abort(); };
  }, []);

  React.useEffect(() => {
    const cleanup = doFetch(q, category, when);
    return () => cleanup();
  }, [q, category, when, doFetch]);

  function handleSearch(v: string) {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setQ(v), 350);
  }

  return (
    <div>
      {/* Filter bar */}
      <div className="mb-6 flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-sm sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Search events"
            placeholder="Search events, venues, cities..."
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-3">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            aria-label="Filter by category"
            className="flex h-11 w-[160px] items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <option value="all">All categories</option>
            {initialCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            value={when}
            onChange={(e) => setWhen(e.target.value)}
            aria-label="Filter by time"
            className="flex h-11 w-[150px] items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <option value="upcoming">
              {String.fromCharCode(160)} Upcoming
            </option>
            <option value="past">
              {String.fromCharCode(160)} Past
            </option>
          </select>
        </div>
      </div>

      {/* States */}
      {error && (
        <EmptyState
          title="Something went wrong"
          description={error}
          action={
            <Button onClick={() => { setError(null); doFetch(q, category, when); }}>
              Try again
            </Button>
          }
        />
      )}

      {!error && events === null && <EventGridSkeleton count={6} />}

      {!error && events !== null && events.length === 0 && (
        <EmptyState
          title="No events found"
          description="Try a different search or check back later."
        />
      )}

      {!error && events !== null && events.length > 0 && (
        <>
          <p className="mb-4 text-sm text-muted-foreground">
            {events.length} event{events.length === 1 ? "" : "s"}
          </p>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
