import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { eventCreateSchema } from "@/lib/validation";
import { getCurrentUser, requireRole } from "@/lib/auth";
import { localToUtc } from "@/lib/tz";
import { getEventAvailability } from "@/lib/capacity";
import { serializeEvent } from "@/lib/events";
import { json, errorResponse, handleError } from "@/lib/api";
import { EVENT_STATUS } from "@/lib/constants";

const PUBLIC_INCLUDE = {
  category: { select: { id: true, name: true, slug: true, color: true } },
  organizer: { select: { name: true } },
  ticketTypes: {
    select: { id: true, name: true, price: true, quantity: true, soldCount: true },
    orderBy: { price: "asc" },
  },
} as const;

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const q = searchParams.get("q")?.trim();
    const from = searchParams.get("from");
    const mine = searchParams.get("mine") === "1";
    const status = searchParams.get("status");

    const where: Record<string, unknown> = {};
    if (user?.role === "ORGANIZER" && mine) {
      where.organizerId = user.id;
    } else if (user?.role === "ADMIN" && status) {
      where.status = status;
    } else {
      where.status = EVENT_STATUS.APPROVED;
    }

    if (category) {
      where.categoryId = category;
    }
    if (q) {
      where.OR = [
        { title: { contains: q } },
        { description: { contains: q } },
        { venueName: { contains: q } },
        { address: { contains: q } },
      ];
    }
    if (from) {
      where.startTime = { gte: new Date(from) };
    }

    const events = await prisma.event.findMany({
      where,
      include: PUBLIC_INCLUDE,
      orderBy: { startTime: "asc" },
    });

    const withAvailability = await Promise.all(
      events.map(async (e) => {
        const availability = await getEventAvailability(e.id);
        return serializeEvent(e as any, availability);
      })
    );

    return json({ events: withAvailability });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole(["ORGANIZER", "ADMIN"])();
    const data = eventCreateSchema.parse(await req.json());

    const category = await prisma.category.findUnique({
      where: { id: data.categoryId },
    });
    if (!category) return errorResponse("Unknown category.", 422);

    const startUtc = localToUtc(data.date, data.startTime, data.timezone);
    const endUtc = localToUtc(data.date, data.endTime, data.timezone);
    if (endUtc <= startUtc) {
      return errorResponse("End time must be after start time.", 422);
    }

    const totalCapacity = data.ticketTypes.reduce((s, t) => s + t.quantity, 0);

    const event = await prisma.event.create({
      data: {
        title: data.title,
        description: data.description,
        startTime: startUtc,
        endTime: endUtc,
        timezone: data.timezone,
        venueName: data.venueName,
        address: data.address,
        lat: data.lat ?? null,
        lng: data.lng ?? null,
        coverImage: data.coverImage || null,
        categoryId: data.categoryId,
        organizerId: user.id,
        capacity: totalCapacity,
        status: EVENT_STATUS.DRAFT,
        ticketTypes: {
          create: data.ticketTypes.map((t) => ({
            name: t.name,
            description: t.description || null,
            price: t.price,
            quantity: t.quantity,
          })),
        },
      },
      include: PUBLIC_INCLUDE,
    });

    const availability = await getEventAvailability(event.id);
    return json({ event: serializeEvent(event as any, availability) }, 201);
  } catch (e) {
    return handleError(e);
  }
}
