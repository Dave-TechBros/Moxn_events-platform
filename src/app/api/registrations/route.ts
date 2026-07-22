import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { holdSchema } from "@/lib/validation";
import { requireRole, logger } from "@/lib/auth";
import { reserveHold } from "@/lib/capacity";
import { json, errorResponse, handleError } from "@/lib/api";

export const dynamic = "force-dynamic";

// Step 1: place a HOLD (capacity reserved atomically). No payment yet.
export async function POST(req: NextRequest) {
  try {
    const user = await requireRole(["ATTENDEE", "ORGANIZER", "ADMIN"])();
    const body = await req.json();
    const { ticketTypeId, quantity } = holdSchema.parse(body);
    const ticket = await prisma.ticketType.findUnique({
      where: { id: ticketTypeId },
      include: { event: true },
    });
    if (!ticket) return errorResponse("Ticket type not found.", 404);

    const registration = await reserveHold({
      eventId: ticket.eventId,
      ticketTypeId,
      userId: user.id,
      quantity,
    });
    logger.registration.hold({
      userId: user.id,
      eventId: ticket.eventId,
      registrationId: registration.id,
      quantity,
    });
    return json(
      {
        registration: {
          id: registration.id,
          status: registration.status,
          holdExpiresAt: registration.holdExpiresAt,
          totalPrice: registration.totalPrice,
        },
      },
      201
    );
  } catch (e) {
    logger.registration.holdFailed({ error: String(e) });
    return handleError(e);
  }
}
