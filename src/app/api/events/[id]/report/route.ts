import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { reportSchema } from "@/lib/validation";
import { json, errorResponse, handleError } from "@/lib/api";

export const dynamic = "force-dynamic";

// Attendee / user reports a listing.
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return errorResponse("Sign in required.", 401);
    const data = reportSchema.parse(await req.json());
    const event = await prisma.event.findUnique({
      where: { id: params.id },
      select: { id: true, status: true },
    });
    if (!event) return errorResponse("Event not found.", 404);
    const report = await prisma.report.create({
      data: { eventId: params.id, userId: user.id, reason: data.reason },
    });
    return json({ report: { id: report.id } }, 201);
  } catch (e) {
    return handleError(e);
  }
}
