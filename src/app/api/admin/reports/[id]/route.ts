import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { json, errorResponse, handleError } from "@/lib/api";

// Admin resolves a flagged report.
export async function PATCH(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireRole(["ADMIN"])();
    const report = await prisma.report.findUnique({
      where: { id: params.id },
    });
    if (!report) return errorResponse("Report not found.", 404);
    const updated = await prisma.report.update({
      where: { id: params.id },
      data: { status: "RESOLVED" },
    });
    return json({ report: { id: updated.id, status: updated.status } });
  } catch (e) {
    return handleError(e);
  }
}
