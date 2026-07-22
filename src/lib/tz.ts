import {
  formatInTimeZone,
  fromZonedTime,
  toZonedTime,
} from "date-fns-tz";

/**
 * All event times are stored in UTC. We display them in two zones:
 *  1. the event's own local timezone (authoritative for "when it happens")
 *  2. the viewer's local timezone (for relatability)
 */

export function formatInTz(
  date: Date,
  tz: string,
  fmt = "MMM d, yyyy h:mm a"
): string {
  try {
    return formatInTimeZone(date, tz, fmt);
  } catch {
    return formatInTimeZone(date, "UTC", fmt);
  }
}

export function formatEventLocal(date: Date, tz: string): string {
  return formatInTz(date, tz, "EEE, MMM d, yyyy · h:mm a");
}

export function formatViewerLocal(date: Date, tz: string): string {
  return formatInTz(date, tz, "MMM d, h:mm a");
}

/**
 * Build a UTC Date from a local date+time string interpreted in `tz`.
 * `dateStr` is "yyyy-MM-dd", `timeStr` is "HH:mm".
 */
export function localToUtc(
  dateStr: string,
  timeStr: string,
  tz: string
): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  // Construct a Date whose wall-clock fields represent the time in `tz`.
  const zoned = new Date(y, m - 1, d, hh, mm, 0, 0);
  return fromZonedTime(zoned, tz);
}

/** Convert a stored UTC Date into the event's local wall-clock fields. */
export function utcToLocalFields(
  date: Date,
  tz: string
): { date: string; time: string } {
  const z = toZonedTime(date, tz);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${z.getFullYear()}-${pad(z.getMonth() + 1)}-${pad(z.getDate())}`,
    time: `${pad(z.getHours())}:${pad(z.getMinutes())}`,
  };
}

/** Best-effort viewer timezone (client only). */
export function viewerTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

// A curated list of IANA timezones for the organizer form.
export const COMMON_TIMEZONES = [
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Athens",
  "Africa/Lagos",
  "Africa/Johannesburg",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Pacific/Auckland",
  "UTC",
];
