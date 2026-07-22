import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getEventAvailability } from "@/lib/capacity";
import { OrganizerDashboard, type DashEvent } from "@/components/organizer-dashboard";

export const dynamic = "force-dynamic";

export default async function OrganizerEventsPage() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "ORGANIZER" && user.role !== "ADMIN"))
    redirect("/login?redirect=/organizer/events");

  const events = await prisma.event.findMany({
    where: { organizerId: user.id },
    include: {
      category: { select: { id: true, name: true, slug: true, color: true } },
      ticketTypes: {
        select: { id: true, name: true, price: true, quantity: true, soldCount: true },
      },
    },
    orderBy: { startTime: "desc" },
  });

  const ids = events.map((e) => e.id);
  const regStats = await prisma.registration.groupBy({
    by: ["eventId", "status"],
    where: { eventId: { in: ids } },
    _count: { _all: true },
  });

  const dashEvents: DashEvent[] = await Promise.all(
    events.map(async (e) => {
      const availability = await getEventAvailability(e.id);
      const statFor = (status: string) =>
        regStats
          .filter((r) => r.eventId === e.id && r.status === status)
          .reduce((s, r) => s + r._count._all, 0);
      return {
        id: e.id,
        title: e.title,
        status: e.status,
        startTime: e.startTime.toISOString(),
        coverImage: e.coverImage,
        category: { name: e.category.name, color: e.category.color },
        availability: {
          totalCapacity: availability.totalCapacity,
          totalSold: availability.totalSold,
        },
        stats: {
          confirmed: statFor("CONFIRMED"),
          checkedIn: (
            await prisma.registration.count({
              where: { eventId: e.id, status: "CONFIRMED", checkedInAt: { not: null } },
            })
          ),
          holds: statFor("HOLD"),
        },
      };
    })
  );

  return <OrganizerDashboard events={dashEvents} />;
}
