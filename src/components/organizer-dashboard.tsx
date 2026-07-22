"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Plus,
  Send,
  Pencil,
  Trash2,
  Ban,
  ExternalLink,
  Loader2,
  Users,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { CategoryTag } from "@/components/category-tag";
import { formatEventLocal } from "@/lib/tz";

export type DashEvent = {
  id: string;
  title: string;
  status: string;
  startTime: string;
  coverImage: string | null;
  category: { name: string; color: string };
  availability: { totalCapacity: number; totalSold: number };
  stats: { confirmed: number; checkedIn: number; holds: number };
};

const STATUS_VARIANT: Record<string, any> = {
  DRAFT: "muted",
  SUBMITTED: "info",
  APPROVED: "success",
  REJECTED: "error",
  CANCELLED: "muted",
};

export function OrganizerDashboard({ events }: { events: DashEvent[] }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState<string | null>(null);

  async function act(id: string, path: string, method: string, okMsg: string) {
    setBusy(id + path);
    try {
      const res = await fetch(`/api/events/${id}${path}`, { method });
      if (res.ok) {
        toast.success(okMsg);
        router.refresh();
      } else {
        const d = await res.json();
        toast.error(d.error || "Action failed");
      }
    } finally {
      setBusy(null);
    }
  }

  if (events.length === 0)
    return (
      <EmptyState
        icon={Plus}
        title="No events yet"
        description="Create your first event listing. It starts as a draft and you submit it for approval when ready."
        action={
          <Button asChild className="tap-target">
            <Link href="/organizer/events/new">Create event</Link>
          </Button>
        }
      />
    );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Your events</h1>
        <Button asChild className="tap-target">
          <Link href="/organizer/events/new">
            <Plus className="h-4 w-4" /> New event
          </Link>
        </Button>
      </div>

      <div className="space-y-3">
        {events.map((e) => (
          <div
            key={e.id}
            className="flex flex-col gap-4 rounded-lg border bg-card p-4 shadow-sm sm:flex-row sm:items-center"
          >
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md bg-muted">
              {e.coverImage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={e.coverImage}
                  alt=""
                  className="h-full w-full object-cover"
                />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Link
                  href={`/events/${e.id}`}
                  className="font-semibold hover:underline"
                >
                  {e.title}
                </Link>
                <Badge variant={STATUS_VARIANT[e.status] ?? "muted"}>
                  {e.status.charAt(0) + e.status.slice(1).toLowerCase()}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {formatEventLocal(new Date(e.startTime), "UTC")}
              </p>
              <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  {e.stats.confirmed} confirmed
                </span>
                <span className="inline-flex items-center gap-1 text-success">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {e.stats.checkedIn} checked in
                </span>
                <span className="inline-flex items-center gap-1 text-warning">
                  <Clock className="h-3.5 w-3.5" />
                  {e.stats.holds} holds
                </span>
                <CategoryTag name={e.category.name} color={e.category.color} />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm" className="tap-target">
                <Link href={`/organizer/events/${e.id}/edit`}>
                  <Pencil className="h-4 w-4" /> Edit
                </Link>
              </Button>
              {(e.status === "DRAFT" || e.status === "REJECTED") && (
                <Button
                  size="sm"
                  className="tap-target"
                  disabled={busy === e.id + "/submit"}
                  onClick={() =>
                    act(e.id, "/submit", "POST", "Submitted for review.")
                  }
                >
                  {busy === e.id + "/submit" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Submit
                </Button>
              )}
              {e.status !== "CANCELLED" && e.status !== "APPROVED" && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="tap-target text-error"
                  disabled={busy === e.id + "/delete"}
                  onClick={() => {
                    if (confirm("Delete this draft? This cannot be undone."))
                      act(e.id, "", "DELETE", "Event deleted.");
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              {e.status === "APPROVED" && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="tap-target text-error"
                  disabled={busy === e.id + "/cancel"}
                  onClick={() => {
                    if (confirm("Cancel this event? Registrations are released."))
                      act(e.id, "/cancel", "POST", "Event cancelled.");
                  }}
                >
                  <Ban className="h-4 w-4" />
                </Button>
              )}
              <Button asChild variant="ghost" size="sm" className="tap-target">
                <Link href={`/events/${e.id}`}>
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
