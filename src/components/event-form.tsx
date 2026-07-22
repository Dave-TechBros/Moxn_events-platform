"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { COMMON_TIMEZONES } from "@/lib/tz";
import type { SerializedEvent } from "@/lib/events";
import type { Category } from "@prisma/client";

type TicketDraft = {
  name: string;
  description: string;
  price: string;
  quantity: string;
};

const emptyTicket = (): TicketDraft => ({
  name: "",
  description: "",
  price: "0",
  quantity: "50",
});

export function EventForm({
  categories,
  event,
}: {
  categories: Category[];
  event?: SerializedEvent;
}) {
  const router = useRouter();
  const editing = !!event;
  const [loading, setLoading] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const [title, setTitle] = React.useState(event?.title ?? "");
  const [description, setDescription] = React.useState(event?.description ?? "");
  const [date, setDate] = React.useState(
    event ? new Date(event.startTime).toISOString().slice(0, 10) : ""
  );
  const [startTime, setStartTime] = React.useState(
    event ? new Date(event.startTime).toTimeString().slice(0, 5) : "19:00"
  );
  const [endTime, setEndTime] = React.useState(
    event ? new Date(event.endTime).toTimeString().slice(0, 5) : "22:00"
  );
  const [timezone, setTimezone] = React.useState(
    event?.timezone ?? "America/New_York"
  );
  const [venueName, setVenueName] = React.useState(event?.venueName ?? "");
  const [address, setAddress] = React.useState(event?.address ?? "");
  const [categoryId, setCategoryId] = React.useState(
    event?.category.id ?? categories[0]?.id ?? ""
  );
  const [coverImage, setCoverImage] = React.useState(event?.coverImage ?? "");
  const [tickets, setTickets] = React.useState<TicketDraft[]>(
    event?.ticketTypes.length
      ? event.ticketTypes.map((t) => ({
          name: t.name,
          description: "",
          price: String(t.price / 100),
          quantity: String(t.quantity),
        }))
      : [emptyTicket()]
  );

  function updateTicket(i: number, patch: Partial<TicketDraft>) {
    setTickets((ts) => ts.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setLoading(true);
    const payload = {
      title,
      description,
      date,
      startTime,
      endTime,
      timezone,
      venueName,
      address,
      categoryId,
      coverImage,
      ticketTypes: tickets.map((t) => ({
        name: t.name,
        description: t.description,
        price: Math.round(Number(t.price) * 100),
        quantity: Number(t.quantity),
      })),
    };
    try {
      const res = editing
        ? await fetch(`/api/events/${event!.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/events", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      const d = await res.json();
      if (!res.ok) {
        if (d.details) {
          const flat: Record<string, string> = {};
          for (const [k, v] of Object.entries(d.details as any)) {
            if (Array.isArray(v)) flat[k] = v[0];
          }
          setErrors(flat);
        }
        throw new Error(d.error || "Could not save event.");
      }
      toast.success(editing ? "Event updated." : "Event created as a draft.");
      router.push("/organizer/events");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">Event title</Label>
        <Input
          id="title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Skyline Synthwave Night"
        />
        {errors.title && <FieldError msg={errors.title} />}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          required
          rows={5}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What's the vibe? Tell attendees what to expect."
        />
        {errors.description && <FieldError msg={errors.description} />}
      </div>

      {/* Law of Proximity: group date/time/location together. */}
      <div className="grid grid-cols-1 gap-4 rounded-lg border p-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          {errors.date && <FieldError msg={errors.date} />}
        </div>
        <div className="space-y-2">
          <Label htmlFor="tz">Timezone</Label>
          <Select value={timezone} onValueChange={setTimezone}>
            <SelectTrigger id="tz">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COMMON_TIMEZONES.map((tz) => (
                <SelectItem key={tz} value={tz}>
                  {tz}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="start">Start time</Label>
          <Input
            id="start"
            type="time"
            required
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
          {errors.startTime && <FieldError msg={errors.startTime} />}
        </div>
        <div className="space-y-2">
          <Label htmlFor="end">End time</Label>
          <Input
            id="end"
            type="time"
            required
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
          />
          {errors.endTime && <FieldError msg={errors.endTime} />}
        </div>
        <div className="space-y-2">
          <Label htmlFor="venue">Venue name</Label>
          <Input
            id="venue"
            required
            value={venueName}
            onChange={(e) => setVenueName(e.target.value)}
          />
          {errors.venueName && <FieldError msg={errors.venueName} />}
        </div>
        <div className="space-y-2">
          <Label htmlFor="address">Address</Label>
          <Input
            id="address"
            required
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
          {errors.address && <FieldError msg={errors.address} />}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger id="category">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.categoryId && <FieldError msg={errors.categoryId} />}
        </div>
        <div className="space-y-2">
          <Label htmlFor="cover">Cover image URL (optional)</Label>
          <Input
            id="cover"
            type="url"
            value={coverImage}
            onChange={(e) => setCoverImage(e.target.value)}
            placeholder="https://…"
          />
          {errors.coverImage && <FieldError msg={errors.coverImage} />}
        </div>
      </div>

      {/* Law of Proximity: group pricing/ticket-type options together. */}
      <div className="space-y-3 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Ticket types</h3>
          {!editing && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="tap-target"
              onClick={() => setTickets((t) => [...t, emptyTicket()])}
            >
              <Plus className="h-4 w-4" /> Add ticket type
            </Button>
          )}
        </div>
        {editing && (
          <p className="text-xs text-muted-foreground">
            Ticket types can&apos;t be edited after publishing. Contact support
            for changes.
          </p>
        )}
        {tickets.map((t, i) => (
          <div
            key={i}
            className="space-y-2 rounded-md border bg-muted/30 p-3"
          >
            <div className="flex items-center gap-2">
              <Input
                aria-label="Ticket name"
                placeholder="General / VIP"
                value={t.name}
                disabled={editing}
                onChange={(e) => updateTicket(i, { name: e.target.value })}
              />
              {!editing && tickets.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="tap-target text-error"
                  onClick={() => setTickets((ts) => ts.filter((_, idx) => idx !== i))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
            <Input
              aria-label="Ticket description"
              placeholder="Optional description"
              value={t.description}
              disabled={editing}
              onChange={(e) => updateTicket(i, { description: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Price (USD)</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={t.price}
                  disabled={editing}
                  onChange={(e) => updateTicket(i, { price: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">Quantity</Label>
                <Input
                  type="number"
                  min={1}
                  value={t.quantity}
                  disabled={editing}
                  onChange={(e) => updateTicket(i, { quantity: e.target.value })}
                />
              </div>
            </div>
          </div>
        ))}
        {errors.ticketTypes && <FieldError msg={errors.ticketTypes} />}
      </div>

      <div className="flex gap-3">
        <Button type="submit" className="tap-target" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Saving…
            </>
          ) : editing ? (
            "Save changes"
          ) : (
            "Create draft"
          )}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="tap-target"
          onClick={() => router.push("/organizer/events")}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

function FieldError({ msg }: { msg: string }) {
  return <p className="text-xs font-medium text-error">{msg}</p>;
}
