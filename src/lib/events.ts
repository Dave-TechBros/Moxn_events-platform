import { EVENT_STATUS, STARTING_SOON_MINUTES } from "@/lib/constants";
import type { EventAvailability } from "@/lib/capacity";

export type EventStateKey =
  | "UPCOMING"
  | "STARTING_SOON"
  | "SOLD_OUT"
  | "PAST"
  | "CANCELLED";

export type EventState = {
  key: EventStateKey;
  label: string;
  // Maps to Badge variant.
  variant: "info" | "warning" | "error" | "muted" | "success";
};

export function getEventState(
  event: { startTime: Date; endTime: Date; status: string },
  availability?: EventAvailability
): EventState {
  if (event.status === EVENT_STATUS.CANCELLED) {
    return { key: "CANCELLED", label: "Cancelled", variant: "muted" };
  }
  if (event.endTime.getTime() < Date.now()) {
    return { key: "PAST", label: "Past event", variant: "muted" };
  }
  if (availability?.soldOut) {
    return { key: "SOLD_OUT", label: "Sold out", variant: "error" };
  }
  const msToStart = event.startTime.getTime() - Date.now();
  if (msToStart <= STARTING_SOON_MINUTES * 60 * 1000) {
    return { key: "STARTING_SOON", label: "Starting soon", variant: "warning" };
  }
  return { key: "UPCOMING", label: "Upcoming", variant: "info" };
}

export function formatMoney(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

type CategoryLite = { id: string; name: string; slug: string; color: string };
type TicketLite = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  soldCount: number;
  description?: string | null;
};

export type EventWithRelations = {
  id: string;
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  timezone: string;
  venueName: string;
  address: string;
  coverImage: string | null;
  capacity: number;
  status: string;
  category: CategoryLite;
  organizer: { name: string };
  ticketTypes: TicketLite[];
};

export type SerializedEvent = {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  timezone: string;
  venueName: string;
  address: string;
  coverImage: string | null;
  capacity: number;
  status: string;
  category: CategoryLite;
  organizer: { name: string };
  ticketTypes: TicketLite[];
  minPrice: number;
  availability: EventAvailability;
  state: EventState;
};

export function serializeEvent(
  event: EventWithRelations,
  availability: EventAvailability
): SerializedEvent {
  const minPrice = event.ticketTypes.length
    ? Math.min(...event.ticketTypes.map((t) => t.price))
    : 0;
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    startTime: event.startTime.toISOString(),
    endTime: event.endTime.toISOString(),
    timezone: event.timezone,
    venueName: event.venueName,
    address: event.address,
    coverImage: event.coverImage,
    capacity: event.capacity,
    status: event.status,
    category: event.category,
    organizer: event.organizer,
    ticketTypes: event.ticketTypes,
    minPrice,
    availability,
    state: getEventState(event, availability),
  };
}

