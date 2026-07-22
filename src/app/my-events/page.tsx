"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Ticket,
  CalendarDays,
  MapPin,
  QrCode,
  XCircle,
  Loader2,
  Clock,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { formatEventLocal } from "@/lib/tz";
import { formatMoney } from "@/lib/events";
import { cn } from "@/lib/utils";

type Reg = {
  id: string;
  status: string;
  quantity: number;
  totalPrice: number;
  qrToken: string | null;
  holdExpiresAt: string | null;
  confirmedAt: string | null;
  checkedInAt: string | null;
  cancelledAt: string | null;
  ticketTypeName: string;
  event: {
    id: string;
    title: string;
    startTime: string;
    endTime: string;
    timezone: string;
    venueName: string;
    address: string;
    coverImage: string | null;
    status: string;
    category: { name: string; color: string };
  };
};

export default function MyEventsPage() {
  const { user, loading: authLoading } = useAuth();
  const [regs, setRegs] = React.useState<Reg[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [openQr, setOpenQr] = React.useState<string | null>(null);
  const [qrMap, setQrMap] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      const res = await fetch("/api/registrations/me");
      const d = await res.json();
      if (res.ok) setRegs(d.registrations);
      else setError("Could not load your events.");
    } catch {
      setError("Network error.");
    }
  }, []);

  React.useEffect(() => {
    if (user) load();
  }, [user, load]);

  async function toggleQr(id: string) {
    if (openQr === id) {
      setOpenQr(null);
      return;
    }
    if (!qrMap[id]) {
      const res = await fetch(`/api/registrations/${id}/qr`);
      const d = await res.json();
      if (res.ok) setQrMap((m) => ({ ...m, [id]: d.qr }));
    }
    setOpenQr(id);
  }

  async function cancel(id: string) {
    setBusy(id);
    try {
      const res = await fetch(`/api/registrations/${id}/cancel`, {
        method: "POST",
      });
      if (res.ok) {
        toast.success("Registration cancelled.");
        load();
      } else {
        const d = await res.json();
        toast.error(d.error || "Could not cancel.");
      }
    } finally {
      setBusy(null);
    }
  }

  if (authLoading) return <PageSkeleton />;
  if (!user)
    return (
      <EmptyState
        icon={Ticket}
        title="Sign in to see your events"
        description="Your tickets, QR passes, and past events live here."
        action={
          <Button asChild className="tap-target">
            <Link href="/login">Sign in</Link>
          </Button>
        }
      />
    );
  if (error)
    return <EmptyState title="Something went wrong" description={error} />;
  if (regs === null) return <PageSkeleton />;
  if (regs.length === 0)
    return (
      <EmptyState
        icon={Ticket}
        title="No events yet"
        description="When you register for an event, it'll show up here with your QR pass."
        action={
          <Button asChild className="tap-target">
            <Link href="/">Browse events</Link>
          </Button>
        }
      />
    );

  const now = Date.now();
  const isFuture = (r: Reg) => new Date(r.event.endTime).getTime() >= now;
  const upcoming = regs.filter(
    (r) => r.status === "CONFIRMED" && isFuture(r) && r.event.status !== "CANCELLED"
  );
  const holds = regs.filter((r) => r.status === "HOLD");
  const past = regs.filter(
    (r) => (r.status === "CONFIRMED" && !isFuture(r)) || r.event.status === "CANCELLED"
  );
  const cancelled = regs.filter((r) =>
    ["CANCELLED", "REFUNDED"].includes(r.status)
  );

  return (
    <div className="space-y-10">
      <h1 className="text-2xl font-bold tracking-tight">My Events</h1>

      <Section title="Upcoming" items={upcoming} empty="No upcoming events.">
        {(r) => (
          <RegCard
            reg={r}
            qr={openQr === r.id ? qrMap[r.id] ?? null : null}
            busy={busy === r.id}
            onToggleQr={() => toggleQr(r.id)}
            onCancel={() => cancel(r.id)}
            canCancel
          />
        )}
      </Section>

      <Section title="Your holds" items={holds} empty="No active holds.">
        {(r) => (
          <RegCard
            reg={r}
            qr={null}
            busy={busy === r.id}
            onToggleQr={() => {}}
            onCancel={() => cancel(r.id)}
            canCancel
            hold
          />
        )}
      </Section>

      <Section title="Past" items={past} empty="No past events.">
        {(r) => (
          <RegCard
            reg={r}
            qr={null}
            busy={busy === r.id}
            onToggleQr={() => {}}
            onCancel={() => {}}
            canCancel={false}
          />
        )}
      </Section>

      {cancelled.length > 0 && (
        <Section title="Cancelled & refunded" items={cancelled} muted>
          {(r) => (
            <RegCard
              reg={r}
              qr={null}
              busy={false}
              onToggleQr={() => {}}
              onCancel={() => {}}
              canCancel={false}
            />
          )}
        </Section>
      )}
    </div>
  );
}

function Section({
  title,
  items,
  empty,
  muted,
  children,
}: {
  title: string;
  items: Reg[];
  empty?: string;
  muted?: boolean;
  children: (r: Reg) => React.ReactNode;
}) {
  return (
    <section>
      {items.length > 0 && (
        <>
          <h2
            className={cn(
              "mb-3 text-lg font-semibold",
              muted && "text-muted-foreground"
            )}
          >
            {title}{" "}
            <span className="text-sm font-normal text-muted-foreground">
              ({items.length})
            </span>
          </h2>
          <div className="space-y-3">
            {items.map((r) => (
              <React.Fragment key={r.id}>{children(r)}</React.Fragment>
            ))}
          </div>
        </>
      )}
      {empty && items.length === 0 && (
        <p className="text-sm text-muted-foreground">{empty}</p>
      )}
    </section>
  );
}

function RegCard({
  reg,
  qr,
  busy,
  onToggleQr,
  onCancel,
  canCancel,
  hold,
}: {
  reg: Reg;
  qr: string | null;
  busy: boolean;
  onToggleQr: () => void;
  onCancel: () => void;
  canCancel: boolean;
  hold?: boolean;
}) {
  const start = new Date(reg.event.startTime);
  const cancelledEvent = reg.event.status === "CANCELLED";
  const statusVariant =
    reg.status === "CONFIRMED"
      ? cancelledEvent
        ? "muted"
        : "success"
      : reg.status === "HOLD"
      ? "warning"
      : "muted";

  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex gap-4">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-md bg-muted">
          {reg.event.coverImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={reg.event.coverImage}
              alt={`Cover for ${reg.event.title}`}
              className="h-full w-full object-cover"
            />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <Link
              href={`/events/${reg.event.id}`}
              className="font-semibold hover:underline"
            >
              {reg.event.title}
            </Link>
            <Badge variant={statusVariant}>
              {cancelledEvent
                ? "Event cancelled"
                : reg.status === "HOLD"
                ? "On hold"
                : reg.checkedInAt
                ? "Checked in"
                : "Confirmed"}
            </Badge>
          </div>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <CalendarDays className="h-4 w-4" />
            {formatEventLocal(start, reg.event.timezone)}
          </p>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            {reg.event.venueName}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {reg.ticketTypeName} · {reg.quantity} ·{" "}
            {reg.totalPrice === 0 ? "Free" : formatMoney(reg.totalPrice)}
          </p>
        </div>
      </div>

      {hold && reg.holdExpiresAt && (
        <p className="mt-3 flex items-center gap-1.5 rounded-md bg-warning/10 px-3 py-2 text-xs text-warning">
          <Clock className="h-4 w-4" /> Held — complete purchase before it
          expires.{" "}
          <Link href={`/events/${reg.event.id}`} className="font-semibold underline">
            Finish
          </Link>
        </p>
      )}

      {reg.status === "CONFIRMED" && !cancelledEvent && (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            className="tap-target"
            onClick={onToggleQr}
          >
            <QrCode className="h-4 w-4" />
            {qr ? "Hide pass" : "Show pass"}
          </Button>
          {canCancel && (
            <Button
              variant="ghost"
              size="sm"
              className="tap-target text-error hover:bg-error/10 hover:text-error"
              onClick={onCancel}
              disabled={busy}
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              Cancel & refund
            </Button>
          )}
        </div>
      )}

      {qr && (
        <div className="mt-3 flex flex-col items-center rounded-md border bg-white p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="Your entry QR code" className="h-40 w-40" />
          <p className="mt-1 text-xs text-muted-foreground">
            Show at the door — one scan per entry.
          </p>
        </div>
      )}
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-40" />
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-28 w-full rounded-lg" />
      ))}
    </div>
  );
}
