"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  CalendarDays,
  MapPin,
  Users,
  Clock,
  CheckCircle2,
  Download,
  Loader2,
  Ticket,
  Flag,
} from "lucide-react";
import type { SerializedEvent } from "@/lib/events";
import { formatMoney } from "@/lib/events";
import { formatEventLocal, formatViewerLocal, viewerTimeZone } from "@/lib/tz";
import { StateBadge } from "@/components/state-badge";
import { CategoryTag } from "@/components/category-tag";
import { CapacityBar } from "@/components/capacity-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type ExistingReg = {
  id: string;
  status: string;
  qrToken: string | null;
  holdExpiresAt: string | null;
  totalPrice: number;
} | null;

export function EventDetail({
  event,
  currentUserId,
  isOwner,
  isAdmin,
  existingReg,
}: {
  event: SerializedEvent;
  currentUserId: string | null;
  isOwner: boolean;
  isAdmin: boolean;
  existingReg: ExistingReg;
}) {
  const [viewerTz, setViewerTz] = React.useState<string | null>(null);
  React.useEffect(() => setViewerTz(viewerTimeZone()), []);

  const start = new Date(event.startTime);
  const end = new Date(event.endTime);

  const [selectedTypeId, setSelectedTypeId] = React.useState(
    event.ticketTypes[0]?.id ?? ""
  );
  const [quantity, setQuantity] = React.useState(1);
  const [phase, setPhase] = React.useState<"select" | "hold" | "confirmed">(
    existingReg?.status === "CONFIRMED"
      ? "confirmed"
      : existingReg?.status === "HOLD"
      ? "hold"
      : "select"
  );
  const [holdId, setHoldId] = React.useState(existingReg?.id ?? "");
  const [holdExpiresAt, setHoldExpiresAt] = React.useState<string | null>(
    existingReg?.holdExpiresAt ?? null
  );
  const [processing, setProcessing] = React.useState(false);
  const [qr, setQr] = React.useState<string | null>(null);

  const [reportOpen, setReportOpen] = React.useState(false);
  const [reportReason, setReportReason] = React.useState("");
  const [reportBusy, setReportBusy] = React.useState(false);

  async function submitReport() {
    if (reportReason.trim().length < 3) return;
    setReportBusy(true);
    try {
      const res = await fetch(`/api/events/${event.id}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reportReason.trim() }),
      });
      if (res.ok) {
        toast.success("Thanks — we'll review this listing.");
        setReportOpen(false);
        setReportReason("");
      } else {
        const d = await res.json();
        toast.error(d.error || "Could not submit report.");
      }
    } finally {
      setReportBusy(false);
    }
  }

  const selectedType = event.ticketTypes.find((t) => t.id === selectedTypeId);
  const selectedAvail = event.availability.perType.find(
    (t) => t.id === selectedTypeId
  );
  const total = (selectedType?.price ?? 0) * quantity;
  const isPast = end.getTime() < Date.now();
  const soldOut = event.availability.soldOut;

  const loadQr = React.useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/registrations/${id}/qr`);
      const d = await res.json();
      if (res.ok) setQr(d.qr);
    } catch {
      /* ignore */
    }
  }, []);

  React.useEffect(() => {
    if (phase === "confirmed" && holdId) loadQr(holdId);
  }, [phase, holdId, loadQr]);

  async function reserve() {
    if (!selectedType) return;
    setProcessing(true);
    try {
      const res = await fetch("/api/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketTypeId: selectedType.id, quantity }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Could not reserve a ticket.");
      setHoldId(d.registration.id);
      setHoldExpiresAt(
        d.registration.holdExpiresAt
          ? new Date(d.registration.holdExpiresAt).toISOString()
          : null
      );
      setPhase("hold");
      toast.success("Seat held — complete your purchase to get the ticket.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reservation failed");
    } finally {
      setProcessing(false);
    }
  }

  async function confirm() {
    setProcessing(true);
    try {
      const res = await fetch(`/api/registrations/${holdId}/confirm`, {
        method: "POST",
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Could not confirm.");
      setPhase("confirmed");
      toast.success("Ticket confirmed! Your QR pass is ready.");
    } finally {
      setProcessing(false);
    }
  }

  async function release() {
    setProcessing(true);
    try {
      await fetch(`/api/registrations/${holdId}/cancel`, { method: "POST" });
      setPhase("select");
      setHoldId("");
      setHoldExpiresAt(null);
      toast.message("Hold released.");
    } finally {
      setProcessing(false);
    }
  }

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${event.venueName}, ${event.address}`
  )}`;

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      {/* Main column */}
      <div className="space-y-6 lg:col-span-2">
        <div>
          <Link
            href="/"
            className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            ← Back to events
          </Link>
          <div className="relative mb-4 aspect-[16/9] w-full overflow-hidden rounded-lg border bg-muted">
            {event.coverImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={event.coverImage}
                alt={`Cover image for ${event.title}`}
                className="h-full w-full object-cover"
              />
            )}
            <div className="absolute left-3 top-3">
              <CategoryTag name={event.category.name} color={event.category.color} />
            </div>
            <div className="absolute right-3 top-3">
              <StateBadge state={event.state} />
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            {event.title}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            by {event.organizer.name}
          </p>
        </div>

        <div className="space-y-4 rounded-lg border bg-card p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="font-semibold">
                {formatEventLocal(start, event.timezone)}
              </p>
              <p className="text-sm text-muted-foreground">
                to {formatEventLocal(end, event.timezone).replace(/^.*· /, "")}
              </p>
              {viewerTz && viewerTz !== event.timezone && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Your time: {formatViewerLocal(start, viewerTz)} –{" "}
                  {formatViewerLocal(end, viewerTz)}
                </p>
              )}
              <p className="mt-1 text-xs text-muted-foreground">
                Times shown in event timezone ({event.timezone}).
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="font-semibold">{event.venueName}</p>
              <p className="text-sm text-muted-foreground">{event.address}</p>
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex items-center text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                Open in maps →
              </a>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Users className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div className="flex-1">
              <p className="font-semibold">Capacity</p>
              <CapacityBar
                remaining={event.availability.overallRemaining}
                total={event.availability.totalCapacity}
                soldOut={soldOut}
                className="mt-2 max-w-sm"
              />
            </div>
          </div>
        </div>

        <div>
          <h2 className="mb-2 text-lg font-semibold">About this event</h2>
          <p className="whitespace-pre-line text-base leading-relaxed text-muted-foreground">
            {event.description}
          </p>
        </div>

        {currentUserId && !isOwner && event.status === "APPROVED" && (
          <div className="border-t pt-4">
            <Dialog open={reportOpen} onOpenChange={setReportOpen}>
              <Button
                variant="ghost"
                size="sm"
                className="tap-target text-muted-foreground"
                onClick={() => setReportOpen(true)}
              >
                <Flag className="h-4 w-4" /> Report this listing
              </Button>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Report this listing</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground">
                  Tell us what&apos;s wrong. Our moderators will review it.
                </p>
                <Textarea
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  placeholder="e.g. Wrong location, misleading description, spam…"
                  rows={4}
                />
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="ghost" className="tap-target">
                      Cancel
                    </Button>
                  </DialogClose>
                  <Button
                    className="tap-target"
                    onClick={submitReport}
                    disabled={reportBusy || reportReason.trim().length < 3}
                  >
                    Submit report
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {isAdmin && (
          <div className="rounded-lg border border-info/30 bg-info/5 p-4 text-sm">
            <p className="font-semibold text-info">Admin view</p>
            <p className="text-muted-foreground">
              Status: {event.status}. You can manage this listing from the admin
              panel.
            </p>
          </div>
        )}
      </div>

      {/* Ticket column */}
      <div className="lg:col-span-1">
        <div className="sticky top-20 space-y-4 rounded-lg border bg-card p-5 shadow-sm">
          {isOwner ? (
            <div className="rounded-md bg-muted p-4 text-sm">
              <p className="font-semibold">You&apos;re organizing this event</p>
              <p className="mt-1 text-muted-foreground">
                Manage registrations and check-in from your organizer dashboard.
              </p>
              <Button asChild className="mt-3 w-full tap-target" variant="outline">
                <Link href="/organizer/events">Go to dashboard</Link>
              </Button>
            </div>
          ) : phase === "confirmed" ? (
            <ConfirmedPanel
              title={event.title}
              qr={qr}
              regId={holdId}
              onManage={() => (window.location.href = "/my-events")}
            />
          ) : phase === "hold" ? (
            <HoldPanel
              holdExpiresAt={holdExpiresAt}
              total={total}
              processing={processing}
              onConfirm={confirm}
              onRelease={release}
            />
          ) : !currentUserId ? (
            <SignInPanel />
          ) : isPast ? (
            <div className="rounded-md bg-muted p-4 text-center text-sm font-medium text-muted-foreground">
              This event has ended.
            </div>
          ) : soldOut ? (
            <div className="rounded-md bg-error/10 p-4 text-center text-sm font-semibold text-error">
              Sold out
            </div>
          ) : (
            <SelectPanel
              event={event}
              selectedTypeId={selectedTypeId}
              setSelectedTypeId={setSelectedTypeId}
              quantity={quantity}
              setQuantity={setQuantity}
              selectedType={selectedType}
              selectedAvail={selectedAvail}
              total={total}
              processing={processing}
              onReserve={reserve}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function SignInPanel() {
  return (
    <div className="space-y-3 text-center">
      <Ticket className="mx-auto h-8 w-8 text-primary" />
      <p className="font-semibold">Get your ticket</p>
      <p className="text-sm text-muted-foreground">
        Sign in to reserve a spot at this event.
      </p>
      <Button asChild className="w-full tap-target">
        <Link href="/login">Sign in to continue</Link>
      </Button>
    </div>
  );
}

function SelectPanel({
  event,
  selectedTypeId,
  setSelectedTypeId,
  quantity,
  setQuantity,
  selectedType,
  selectedAvail,
  total,
  processing,
  onReserve,
}: {
  event: SerializedEvent;
  selectedTypeId: string;
  setSelectedTypeId: (v: string) => void;
  quantity: number;
  setQuantity: (v: number) => void;
  selectedType?: {
    id: string;
    name: string;
    price: number;
    description?: string | null;
  };
  selectedAvail?: { remaining: number; soldOut: boolean };
  total: number;
  processing: boolean;
  onReserve: () => void;
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Get tickets</h2>
      <div className="space-y-2">
        {event.ticketTypes.map((t) => {
          const avail = event.availability.perType.find((a) => a.id === t.id);
          const disabled = avail?.soldOut;
          return (
            <label
              key={t.id}
              className={cn(
                "flex cursor-pointer items-start justify-between gap-3 rounded-md border p-3 transition-colors",
                selectedTypeId === t.id ? "border-primary bg-primary/5" : "",
                disabled && "cursor-not-allowed opacity-60"
              )}
            >
              <div className="flex items-start gap-3">
                <input
                  type="radio"
                  name="ticket"
                  value={t.id}
                  checked={selectedTypeId === t.id}
                  disabled={disabled}
                  onChange={() => setSelectedTypeId(t.id)}
                  className="mt-1"
                />
                <div>
                  <p className="font-medium">{t.name}</p>
                  {t.description && (
                    <p className="text-xs text-muted-foreground">{t.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {avail?.remaining ?? 0} left
                  </p>
                </div>
              </div>
              <span className="font-semibold">
                {t.price === 0 ? "Free" : formatMoney(t.price)}
              </span>
            </label>
          );
        })}
      </div>

      <div className="space-y-2">
        <Label htmlFor="qty">Quantity</Label>
        <Input
          id="qty"
          type="number"
          min={1}
          max={Math.min(20, selectedAvail?.remaining ?? 20)}
          value={quantity}
          onChange={(e) =>
            setQuantity(Math.max(1, Math.min(20, Number(e.target.value) || 1)))
          }
        />
      </div>

      <div className="flex items-center justify-between border-t pt-3 text-base">
        <span className="text-muted-foreground">Total</span>
        <span className="text-xl font-bold">
          {total === 0 ? "Free" : formatMoney(total)}
        </span>
      </div>

      <Button
        className="w-full tap-target"
        onClick={onReserve}
        disabled={processing || !selectedType || selectedAvail?.soldOut}
      >
        {processing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Reserving…
          </>
        ) : total === 0 ? (
          "Reserve a spot"
        ) : (
          "Get tickets"
        )}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Demo only — no real payment is processed.
      </p>
    </div>
  );
}

function HoldPanel({
  holdExpiresAt,
  total,
  processing,
  onConfirm,
  onRelease,
}: {
  holdExpiresAt: string | null;
  total: number;
  processing: boolean;
  onConfirm: () => void;
  onRelease: () => void;
}) {
  const [secs, setSecs] = React.useState<number | null>(null);
  React.useEffect(() => {
    if (!holdExpiresAt) return;
    const tick = () => {
      const s = Math.max(0, Math.round((new Date(holdExpiresAt).getTime() - Date.now()) / 1000));
      setSecs(s);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [holdExpiresAt]);

  const urgent = secs !== null && secs < 120;

  return (
    <div className="space-y-4">
      <div
        className={cn(
          "flex items-center gap-2 rounded-md p-3 text-sm",
          urgent ? "bg-warning/10 text-warning" : "bg-muted text-muted-foreground"
        )}
      >
        <Clock className="h-4 w-4" />
        {secs !== null ? (
          <span>
            Held for{" "}
            <span className="font-semibold">
              {Math.floor(secs / 60)}:{String(secs % 60).padStart(2, "0")}
            </span>{" "}
            — complete to secure your ticket.
          </span>
        ) : (
          <span>Your spot is on hold.</span>
        )}
      </div>

      <div className="flex items-center justify-between text-base">
        <span className="text-muted-foreground">Total due</span>
        <span className="text-xl font-bold">
          {total === 0 ? "Free" : formatMoney(total)}
        </span>
      </div>

      <Button className="w-full tap-target" onClick={onConfirm} disabled={processing}>
        {processing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Processing…
          </>
        ) : total === 0 ? (
          "Confirm registration"
        ) : (
          `Pay ${formatMoney(total)} & get ticket`
        )}
      </Button>
      <Button
        variant="ghost"
        className="w-full tap-target"
        onClick={onRelease}
        disabled={processing}
      >
        Release hold
      </Button>
    </div>
  );
}

function ConfirmedPanel({
  title,
  qr,
  regId,
  onManage,
}: {
  title: string;
  qr: string | null;
  regId: string;
  onManage: () => void;
}) {
  return (
    <div className="space-y-4 text-center">
      <CheckCircle2 className="mx-auto h-10 w-10 text-success" />
      <div>
        <p className="text-lg font-semibold">You&apos;re going!</p>
        <p className="text-sm text-muted-foreground">{title}</p>
      </div>
      <div className="rounded-lg border bg-white p-4">
        {qr ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qr} alt="Your entry QR code" className="mx-auto h-44 w-44" />
        ) : (
          <div className="grid h-44 w-44 place-items-center bg-muted">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          Show this at the door. One scan = one entry.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        {qr && (
          <a href={qr} download={`moxn-eventra-${regId}.png`}>
            <Button variant="outline" className="w-full tap-target">
              <Download className="h-4 w-4" /> Download pass
            </Button>
          </a>
        )}
        <Button onClick={onManage} className="w-full tap-target">
          View in My Events
        </Button>
      </div>
    </div>
  );
}
