import { prisma } from "@/lib/prisma";
import { ReportsManager } from "@/components/reports-manager";

export const dynamic = "force-dynamic";

export default async function AdminReportsPage() {
  const reports = await prisma.report.findMany({
    where: { status: "OPEN" },
    orderBy: { createdAt: "desc" },
    include: {
      event: { select: { id: true, title: true, status: true } },
      user: { select: { name: true, email: true } },
    },
  });

  const serialized = reports.map((r) => ({
    id: r.id,
    reason: r.reason,
    createdAt: r.createdAt.toISOString(),
    event: r.event,
    user: r.user,
  }));

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold">
        Flagged listings ({serialized.length})
      </h2>
      <ReportsManager initial={serialized} />
    </div>
  );
}
