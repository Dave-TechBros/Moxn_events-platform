import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getEventAvailability } from "@/lib/capacity";
import { serializeEvent } from "@/lib/events";
import { EventDetail } from "@/components/event-detail";

export const dynamic = "force-dynamic";

const INCLUDE = {
  category: { select: { id: true, name: true, slug: true, color: true } },
  organizer: { select: { name: true } },
  ticketTypes: {
    select: { id: true, name: true, price: true, quantity: true, soldCount: true, description: true },
    orderBy: { price: "asc" },
  },
} as const;

export default async function EventDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await getCurrentUser();
  const event = await prisma.event.findUnique({
    where: { id: params.id },
    include: INCLUDE,
  });
  if (!event) notFound();

  const canView =
    event.status === "APPROVED" ||
    (user && event.organizerId === user.id) ||
    user?.role === "ADMIN";
  if (!canView) notFound();

  const availability = await getEventAvailability(event.id);
  const serialized = serializeEvent(event as any, availability);

  let existingReg: {
    id: string;
    status: string;
    qrToken: string | null;
    holdExpiresAt: string | null;
    totalPrice: number;
  } | null = null;
  if (user) {
    const reg = await prisma.registration.findFirst({
      where: {
        eventId: event.id,
        userId: user.id,
        status: { in: ["HOLD", "CONFIRMED", "REFUNDED"] },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        qrToken: true,
        holdExpiresAt: true,
        totalPrice: true,
      },
    });
    existingReg = reg
      ? {
          ...reg,
          holdExpiresAt: reg.holdExpiresAt ? reg.holdExpiresAt.toISOString() : null,
        }
      : null;
  }

  const isOwner = !!user && event.organizerId === user.id;

  return (
    <EventDetail
      event={serialized}
      currentUserId={user?.id ?? null}
      isOwner={isOwner}
      isAdmin={user?.role === "ADMIN"}
      existingReg={existingReg}
    />
  );
}
