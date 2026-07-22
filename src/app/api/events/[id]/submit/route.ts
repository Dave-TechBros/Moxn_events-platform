import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { json, errorResponse, handleError } from "@/lib/api";
import { EVENT_STATUS } from "@/lib/constants";

export const dynamic = "force-dynamic";

// Organizer submits a draft for admin approval.
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
      return errorResponse("Cancelled events cannot be submitted.", 409);
    }
    const updated = await prisma.event.update({
      where: { id: params.id },
      data: { status: EVENT_STATUS.SUBMITTED, publishedAt: null },
    });
    return json({ event: { id: updated.id, status: updated.status } });
  } catch (e) {
    return handleError(e);
  }
}
