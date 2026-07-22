"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/empty-state";
import { CategoryTag } from "@/components/category-tag";
import { formatEventLocal } from "@/lib/tz";

type QueueEvent = {
  id: string;
  title: string;
  description: string;
  startTime: string;
  timezone: string;
  venueName: string;
  address: string;
  coverImage: string | null;
  category: { name: string; color: string };
  organizer: { name: string };
  ticketTypes: { name: string; price: number; quantity: number }[];
};

export function ReviewQueue({ events }: { events: QueueEvent[] }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState<string | null>(null);
  const [rejectId, setRejectId] = React.useState<string | null>(null);
  const [reason, setReason] = React.useState("");

  async function review(id: string, action: "APPROVED" | "REJECTED", rej?: string) {
    setBusy(id + action);
    try {
      const res = await fetch(`/api/admin/events/${id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          action === "REJECTED" ? { action, rejectionReason: rej } : { action }
        ),
      });
      if (res.ok) {
        toast.success(action === "APPROVED" ? "Approved & published." : "Rejected.");
        setRejectId(null);
        setReason("");
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
        title="Queue is clear"
        description="No events are waiting for approval right now."
      />
    );

  return (
    <div className="space-y-4">
      {events.map((e) => (
        <div key={e.id} className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="h-32 w-full shrink-0 overflow-hidden rounded-md bg-muted sm:w-48">
              {e.coverImage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={e.coverImage} alt="" className="h-full w-full object-cover" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{e.title}</h3>
                <CategoryTag name={e.category.name} color={e.category.color} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                by {e.organizer.name}
              </p>
              <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                {e.description}
              </p>
              <p className="mt-2 text-sm">
                {formatEventLocal(new Date(e.startTime), e.timezone)} ·{" "}
                {e.venueName}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {e.ticketTypes.map((t) => (
                  <span
                    key={t.name}
                    className="rounded-full bg-muted px-2 py-0.5 text-xs"
                  >
                    {t.name} · {t.quantity} ·{" "}
                    {t.price === 0 ? "Free" : `$${(t.price / 100).toFixed(2)}`}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {rejectId === e.id ? (
            <div className="mt-4 space-y-2 border-t pt-4">
              <Label htmlFor={`reason-${e.id}`}>Reason for rejection</Label>
              <Textarea
                id={`reason-${e.id}`}
                value={reason}
                onChange={(ev) => setReason(ev.target.value)}
                placeholder="Let the organizer know what to fix…"
              />
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  className="tap-target"
                  disabled={busy === e.id + "REJECTED" || reason.trim().length < 3}
                  onClick={() => review(e.id, "REJECTED", reason.trim())}
                >
                  {busy === e.id + "REJECTED" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Confirm reject"
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="tap-target"
                  onClick={() => setRejectId(null)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-4 flex gap-2 border-t pt-4">
              <Button
                size="sm"
                className="tap-target"
                disabled={busy === e.id + "APPROVED"}
                onClick={() => review(e.id, "APPROVED")}
              >
                {busy === e.id + "APPROVED" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Approve
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="tap-target"
                onClick={() => setRejectId(e.id)}
              >
                <X className="h-4 w-4" /> Reject
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
