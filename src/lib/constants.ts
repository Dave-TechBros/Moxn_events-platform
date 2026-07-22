// Shared constants and small helpers used across the app.

export const ROLES = {
  ATTENDEE: "ATTENDEE",
  ORGANIZER: "ORGANIZER",
  ADMIN: "ADMIN",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const EVENT_STATUS = {
  DRAFT: "DRAFT",
  SUBMITTED: "SUBMITTED",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  CANCELLED: "CANCELLED",
} as const;

export type EventStatus =
  (typeof EVENT_STATUS)[keyof typeof EVENT_STATUS];

export const REGISTRATION_STATUS = {
  HOLD: "HOLD",
  CONFIRMED: "CONFIRMED",
  CANCELLED: "CANCELLED",
  REFUNDED: "REFUNDED",
} as const;

export type RegistrationStatus =
  (typeof REGISTRATION_STATUS)[keyof typeof REGISTRATION_STATUS];

export const HOLD_MINUTES = Number(process.env.HOLD_MINUTES ?? "10");

// Public, approved events are the only ones attendees can see.
export const PUBLIC_EVENT_STATUSES: EventStatus[] = [
  EVENT_STATUS.APPROVED,
];

// Minutes threshold for the "starting soon" urgency badge.
export const STARTING_SOON_MINUTES = 24 * 60; // within 24h

export function isPast(date: Date): boolean {
  return date.getTime() <= Date.now();
}
