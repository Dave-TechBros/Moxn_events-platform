import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2, "Name is too short").max(80),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["ATTENDEE", "ORGANIZER"]).default("ATTENDEE"),
});

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export const ticketTypeSchema = z.object({
  name: z.string().min(1, "Ticket name required").max(40),
  description: z.string().max(200).optional().default(""),
  price: z.coerce.number().int().min(0).max(1_000_000),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1").max(1_000_000),
});

export const eventCreateSchema = z.object({
  title: z.string().min(3, "Title is too short").max(120),
  description: z.string().min(10, "Add a description").max(4000),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid start time"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid end time"),
  timezone: z.string().min(1),
  venueName: z.string().min(1, "Venue name required").max(120),
  address: z.string().min(1, "Address required").max(200),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  categoryId: z.string().min(1, "Pick a category"),
  coverImage: z.string().url().optional().or(z.literal("")).default(""),
  ticketTypes: z.array(ticketTypeSchema).min(1, "Add at least one ticket type"),
});

export const eventUpdateSchema = eventCreateSchema.partial().extend({
  ticketTypes: z.array(ticketTypeSchema).optional(),
  status: z.string().optional(),
  rejectionReason: z.string().optional(),
});

export const holdSchema = z.object({
  ticketTypeId: z.string().min(1),
  quantity: z.coerce.number().int().min(1).max(20).default(1),
});

export const categorySchema = z.object({
  name: z.string().min(1).max(40),
  slug: z
    .string()
    .min(1)
    .max(40)
    .regex(/^[a-z0-9-]+$/, "slug: lowercase letters, numbers, dashes"),
  color: z.string().regex(/^\d{1,3} \d{1,3}% \d{1,3}%$/, "HSL like '220 14% 50%'"),
});

export const reportSchema = z.object({
  reason: z.string().min(3, "Add a reason").max(500),
});
