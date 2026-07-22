import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { eventUpdateSchema } from "@/lib/validation";
import { getCurrentUser } from "@/lib/auth";
import { localToUtc } from "@/lib/tz";
import { getEventAvailability } from "@/lib/capacity";
import { serializeEvent } from "@/lib/events";
import { json, errorResponse, handleError } from "@/lib/api";
import { EVENT_STATUS } from "@/lib/constants";

const INCLUDE = {
  category: { select: { id: true, name: true, slug: true, color: true } },
  organizer: { select: { name: true } },
  ticketTypes: {
    select: { id: true, name: true, price: true, quantity: true, soldCount: true },
    orderBy: { price: "asc" },
  },
} as const;

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    const event = await prisma.event.findUnique({
      where: { id: params.id },
      include: INCLUDE,
    });
    if (!event) return errorResponse("Event not found.", 404);

    const canView =
      event.status === EVENT_STATUS.APPROVED ||
      (user && event.organizerId === user.id) ||
      user?.role === "ADMIN";
    if (!canView) return errorResponse("Event not found.", 404);

    const availability = await getEventAvailability(event.id);
    const serialized = serializeEvent(event as any, availability);

    // Organizers get their own registration stats.
    let stats = null;
    if (user && (event.organizerId === user.id || user.role === "ADMIN")) {
      const [confirmed, checkedIn, holds] = await Promise.all([
        prisma.registration.count({
          where: { eventId: event.id, status: "CONFIRMED" },
        }),
        prisma.registration.count({
          where: { eventId: event.id, status: "CONFIRMED", checkedInAt: { not: null } },
        }),
        prisma.registration.count({
          where: { eventId: event.id, status: "HOLD" },
        }),
      ]);
      stats = { confirmed, checkedIn, holds };
    }

    return json({ event: serialized, stats });
  } catch (e) {
    return handleError(e);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return errorResponse("Sign in required.", 401);
    const event = await prisma.event.findUnique({ where: { id: params.id } });
    if (!event) return errorResponse("Event not found.", 404);
    const isOwner = event.organizerId === user.id;
    const isAdmin = user.role === "ADMIN";
    if (!isOwner && !isAdmin) return errorResponse("Forbidden.", 403);

    const data = eventUpdateSchema.parse(await req.json());

    // Admin can flip approval status / rejection reason directly.
    const statusUpdate: Record<string, unknown> = {};
    if (isAdmin && typeof data.status === "string") {
      statusUpdate.status = data.status;
    }
    if (isAdmin && "rejectionReason" in data) {
      statusUpdate.rejectionReason = data.rejectionReason || null;
    }

    const updateData: Record<string, unknown> = { ...statusUpdate };
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.venueName !== undefined) updateData.venueName = data.venueName;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.coverImage !== undefined)
      updateData.coverImage = data.coverImage || null;
    if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
    if (data.lat !== undefined) updateData.lat = data.lat ?? null;
    if (data.lng !== undefined) updateData.lng = data.lng ?? null;
    if (data.date && data.startTime && data.timezone) {
      updateData.startTime = localToUtc(data.date, data.startTime, data.timezone);
    }
    if (data.date && data.endTime && data.timezone) {
      updateData.endTime = localToUtc(data.date, data.endTime, data.timezone);
    }
    if (data.timezone !== undefined) updateData.timezone = data.timezone;

    const updated = await prisma.event.update({
      where: { id: params.id },
      data: updateData,
      include: INCLUDE,
    });
    const availability = await getEventAvailability(updated.id);
    return json({ event: serializeEvent(updated as any, availability) });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return errorResponse("Sign in required.", 401);
    const event = await prisma.event.findUnique({ where: { id: params.id } });
    if (!event) return errorResponse("Event not found.", 404);
    if (event.organizerId !== user.id && user.role !== "ADMIN") {
      return errorResponse("Forbidden.", 403);
    }
    if (event.status === EVENT_STATUS.APPROVED) {
      return errorResponse("Cancel the event instead of deleting it.", 409);
    }
    await prisma.event.delete({ where: { id: params.id } });
    return json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
