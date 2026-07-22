import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, logger } from "@/lib/auth";
import { extractToken } from "@/lib/qr";
import { json, errorResponse, handleError } from "@/lib/api";
import { EVENT_STATUS } from "@/lib/constants";

// Real-time scan-to-validate at the door.
export async function POST(req: NextRequest) {
  try {
    await requireRole(["ADMIN", "ORGANIZER"])();
    const body = await req.json();
    const token = extractToken(body?.token ?? "");
    if (!token) return errorResponse("No valid code detected.", 422);

    const reg = await prisma.registration.findUnique({
      where: { qrToken: token },
      include: {
        event: { select: { id: true, title: true, status: true, endTime: true } },
        user: { select: { name: true, email: true } },
        ticketType: { select: { name: true } },
      },
    });

    if (!reg) {
      logger.checkin.rejected({ reason: "unknown_token" });
      return errorResponse("Invalid pass. This code is not recognized.", 404);
    }
    if (reg.event.status === EVENT_STATUS.CANCELLED) {
      logger.checkin.rejected({ registrationId: reg.id, reason: "cancelled" });
      return errorResponse("This event has been cancelled.", 409);
    }
    if (reg.status !== "CONFIRMED") {
      logger.checkin.rejected({
        registrationId: reg.id,
        reason: `status_${reg.status}`,
      });
      return errorResponse(
        reg.status === "HOLD"
          ? "This ticket is on hold — payment not completed."
          : "This ticket was cancelled or refunded.",
        409
      );
    }
    if (reg.checkedInAt) {
      return json(
        {
          alreadyCheckedIn: true,
          attendee: {
            name: reg.user.name,
            email: reg.user.email,
            ticketType: reg.ticketType.name,
            quantity: reg.quantity,
            checkedInAt: reg.checkedInAt,
            event: reg.event.title,
          },
        },
        200
      );
    }

    const updated = await prisma.registration.update({
      where: { id: reg.id },
      data: { checkedInAt: new Date() },
    });
    logger.checkin.success({ registrationId: reg.id, eventId: reg.event.id });
    return json(
      {
        ok: true,
        attendee: {
          name: reg.user.name,
          email: reg.user.email,
          ticketType: reg.ticketType.name,
          quantity: reg.quantity,
          checkedInAt: updated.checkedInAt,
          event: reg.event.title,
        },
      },
      200
    );
  } catch (e) {
    return handleError(e);
  }
}
