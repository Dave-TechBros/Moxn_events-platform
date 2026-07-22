import { prisma } from "@/lib/prisma";
import { ReviewQueue } from "@/components/review-queue";

export const dynamic = "force-dynamic";

const INCLUDE = {
  category: { select: { name: true, color: true } },
  organizer: { select: { name: true } },
  ticketTypes: { select: { name: true, price: true, quantity: true } },
} as const;

export default async function AdminReviewPage() {
  const events = await prisma.event.findMany({
    where: { status: "SUBMITTED" },
    orderBy: { createdAt: "asc" },
    include: INCLUDE,
  });

  const serialized = events.map((e) => ({
    id: e.id,
    title: e.title,
    description: e.description,
    startTime: e.startTime.toISOString(),
    timezone: e.timezone,
    venueName: e.venueName,
    address: e.address,
    coverImage: e.coverImage,
    category: e.category,
    organizer: e.organizer,
    ticketTypes: e.ticketTypes,
  }));

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold">
        Review queue ({serialized.length})
      </h2>
      <ReviewQueue events={serialized} />
    </div>
  );
}
