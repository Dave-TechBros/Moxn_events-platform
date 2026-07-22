import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getEventAvailability } from "@/lib/capacity";
import { serializeEvent } from "@/lib/events";
import { EventForm } from "@/components/event-form";

export const dynamic = "force-dynamic";

const INCLUDE = {
  category: { select: { id: true, name: true, slug: true, color: true } },
  organizer: { select: { name: true } },
  ticketTypes: {
    select: { id: true, name: true, price: true, quantity: true, soldCount: true },
    orderBy: { price: "asc" },
  },
} as const;

export default async function EditEventPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const event = await prisma.event.findUnique({
    where: { id: params.id },
    include: INCLUDE,
  });
  if (!event) notFound();
  if (event.organizerId !== user.id && user.role !== "ADMIN") redirect("/login");

  const availability = await getEventAvailability(event.id);
  const serialized = serializeEvent(event as any, availability);

  const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Edit event</h1>
        <p className="text-sm text-muted-foreground">
          Status: {event.status}.{" "}
          {event.status === "APPROVED"
            ? "Ticket types are locked once published."
            : ""}
        </p>
      </div>
      <EventForm categories={categories} event={serialized} />
    </div>
  );
}
