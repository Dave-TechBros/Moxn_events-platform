import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { EventForm } from "@/components/event-form";

export const dynamic = "force-dynamic";

export default async function NewEventPage() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "ORGANIZER" && user.role !== "ADMIN"))
    redirect("/login?redirect=/organizer/events/new");

  const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Create an event</h1>
        <p className="text-sm text-muted-foreground">
          Your event starts as a draft. Submit it for review when it&apos;s
          ready to go live.
        </p>
      </div>
      <EventForm categories={categories} />
    </div>
  );
}
