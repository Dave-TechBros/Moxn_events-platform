import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { json, errorResponse, handleError } from "@/lib/api";

export async function GET(_req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return errorResponse("Sign in required.", 401);

    const regs = await prisma.registration.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        ticketType: { select: { name: true, price: true } },
        event: {
          include: {
            category: { select: { name: true, slug: true, color: true } },
          },
        },
      },
    });

    const items = regs.map((r) => ({
      id: r.id,
      status: r.status,
      quantity: r.quantity,
      totalPrice: r.totalPrice,
      qrToken: r.status === "CONFIRMED" ? r.qrToken : null,
      holdExpiresAt: r.holdExpiresAt,
      confirmedAt: r.confirmedAt,
      checkedInAt: r.checkedInAt,
      cancelledAt: r.cancelledAt,
      ticketTypeName: r.ticketType.name,
      event: {
        id: r.event.id,
        title: r.event.title,
        startTime: r.event.startTime,
        endTime: r.event.endTime,
        timezone: r.event.timezone,
        venueName: r.event.venueName,
        address: r.event.address,
        coverImage: r.event.coverImage,
        status: r.event.status,
        category: r.event.category,
      },
    }));
    return json({ registrations: items });
  } catch (e) {
    return handleError(e);
  }
}
