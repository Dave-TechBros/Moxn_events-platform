import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { categorySchema } from "@/lib/validation";
import { requireRole } from "@/lib/auth";
import { json, errorResponse, handleError } from "@/lib/api";

export async function GET() {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { events: true } } },
  });
  return json({ categories });
}

export async function POST(req: NextRequest) {
  try {
    await requireRole(["ADMIN"])();
    const data = categorySchema.parse(await req.json());
    const existing = await prisma.category.findFirst({
      where: { OR: [{ slug: data.slug }, { name: data.name }] },
    });
    if (existing) {
      return errorResponse("A category with that name or slug exists.", 409);
    }
    const category = await prisma.category.create({ data });
    return json({ category }, 201);
  } catch (e) {
    return handleError(e);
  }
}
