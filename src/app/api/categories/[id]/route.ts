import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { categorySchema } from "@/lib/validation";
import { requireRole } from "@/lib/auth";
import { json, errorResponse, handleError } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireRole(["ADMIN"])();
    const data = categorySchema.partial().parse(await req.json());
    const category = await prisma.category.update({
      where: { id: params.id },
      data,
    });
    return json({ category });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireRole(["ADMIN"])();
    const used = await prisma.event.count({ where: { categoryId: params.id } });
    if (used > 0) {
      return errorResponse(
        "Cannot delete a category that has events. Reassign them first.",
        409
      );
    }
    await prisma.category.delete({ where: { id: params.id } });
    return json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
