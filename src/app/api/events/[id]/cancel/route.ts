import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { json, errorResponse, handleError } from "@/lib/api";
import { EVENT_STATUS } from "@/lib/constants";

// Cancel an event. Downstream effect: confirmed tickets can no longer be
// used for check-in (the scanner rejects cancelled events). Holds are released.
export async function POST(
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
    if (event.status === EVENT_STATUS.CANCELLED) {
      return json({ event: { id: event.id, status: event.status } });
    }
    const updated = await prisma.$transaction(async (tx) => {
      await tx.registration.updateMany({
        where: { eventId: event.id, status: "HOLD" },
        data: { status: "CANCELLED", cancelledAt: new Date() },
      });
      return tx.event.update({
        where: { id: event.id },
        data: { status: EVENT_STATUS.CANCELLED },
      });
    });
    return json({ event: { id: updated.id, status: updated.status } });
  } catch (e) {
    return handleError(e);
  }
}
