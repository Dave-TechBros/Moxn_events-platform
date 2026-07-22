import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { json, errorResponse, handleError } from "@/lib/api";
import { EVENT_STATUS } from "@/lib/constants";

const schema = {
  parse(body: any) {
    const action = body?.action;
    if (action !== EVENT_STATUS.APPROVED && action !== EVENT_STATUS.REJECTED) {
      throw new Error("action must be APPROVED or REJECTED");
    }
    return { action, rejectionReason: body?.rejectionReason ?? null };
  },
};

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireRole(["ADMIN"])();
    const { action, rejectionReason } = schema.parse(await req.json());
    const event = await prisma.event.findUnique({ where: { id: params.id } });
    if (!event) return errorResponse("Event not found.", 404);
    if (event.status !== EVENT_STATUS.SUBMITTED) {
      return errorResponse("Only submitted events can be reviewed.", 409);
    }
    const updated = await prisma.event.update({
      where: { id: params.id },
      data: {
        status: action,
        rejectionReason:
          action === EVENT_STATUS.REJECTED ? rejectionReason : null,
        publishedAt: action === EVENT_STATUS.APPROVED ? new Date() : null,
      },
    });
    return json({
      event: { id: updated.id, status: updated.status },
    });
  } catch (e) {
    return handleError(e);
  }
}
