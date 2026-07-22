import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, logger } from "@/lib/auth";
import { refundRegistration, cancelHold } from "@/lib/capacity";
import { json, errorResponse, handleError } from "@/lib/api";

// Cancel a HOLD, or refund a CONFIRMED ticket (frees capacity).
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireRole(["ATTENDEE", "ORGANIZER", "ADMIN"])();
    const reg = await prisma.registration.findUnique({
      where: { id: params.id, userId: user.id },
    });
    if (!reg) return errorResponse("Registration not found.", 404);
    if (reg.status === "CONFIRMED") {
      await refundRegistration(params.id, user.id);
    } else {
      await cancelHold(params.id, user.id);
    }
    logger.registration.cancel({ userId: user.id, registrationId: params.id });
    return json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
