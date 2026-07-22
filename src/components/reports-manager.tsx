"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Flag, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";

type Report = {
  id: string;
  reason: string;
  createdAt: string;
  event: { id: string; title: string; status: string };
  user: { name: string; email: string };
};

export function ReportsManager({ initial }: { initial: Report[] }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState<string | null>(null);

  async function resolve(id: string) {
    setBusy(id);
    try {
      const res = await fetch(`/api/admin/reports/${id}`, { method: "PATCH" });
      if (res.ok) {
        toast.success("Report resolved.");
        router.refresh();
      } else {
        toast.error("Could not resolve.");
      }
    } finally {
      setBusy(null);
    }
  }

  if (initial.length === 0)
    return (
      <EmptyState
        icon={Flag}
        title="No flagged listings"
        description="Reports from attendees will appear here for moderation."
      />
    );

  return (
    <div className="space-y-3">
      {initial.map((r) => (
        <div key={r.id} className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <a
                href={`/events/${r.event.id}`}
                className="font-semibold hover:underline"
              >
                {r.event.title}
              </a>
              <Badge variant="muted" className="ml-2">
                {r.event.status}
              </Badge>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="tap-target"
              disabled={busy === r.id}
              onClick={() => resolve(r.id)}
            >
              {busy === r.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Resolve"
              )}
            </Button>
          </div>
          <p className="mt-2 rounded-md bg-muted p-3 text-sm">{r.reason}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Reported by {r.user.name} ({r.user.email}) ·{" "}
            {new Date(r.createdAt).toLocaleDateString()}
          </p>
        </div>
      ))}
    </div>
  );
}
