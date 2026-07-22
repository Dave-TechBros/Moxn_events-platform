import { prisma } from "@/lib/prisma";
import { CategoriesManager } from "@/components/categories-manager";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { events: true } } },
  });
  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold">Categories</h2>
      <CategoriesManager initial={categories} />
    </div>
  );
}
