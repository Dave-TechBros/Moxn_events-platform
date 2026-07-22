import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function AdminOverview() {
  const [submitted, approved, rejected, reportsOpen, organizers, attendees] =
    await Promise.all([
      prisma.event.count({ where: { status: "SUBMITTED" } }),
      prisma.event.count({ where: { status: "APPROVED" } }),
      prisma.event.count({ where: { status: "REJECTED" } }),
      prisma.report.count({ where: { status: "OPEN" } }),
      prisma.user.count({ where: { role: "ORGANIZER" } }),
      prisma.user.count({ where: { role: "ATTENDEE" } }),
    ]);

  const recent = await prisma.event.findMany({
    where: { status: "SUBMITTED" },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: { category: { select: { name: true, color: true } }, organizer: { select: { name: true } } },
  });

  const stats = [
    { label: "Awaiting review", value: submitted, href: "/admin/review", tone: "warning" as const },
    { label: "Live events", value: approved, href: "/admin/review", tone: "success" as const },
    { label: "Rejected", value: rejected, href: "/admin/review", tone: "error" as const },
    { label: "Open reports", value: reportsOpen, href: "/admin/reports", tone: "info" as const },
    { label: "Organizers", value: organizers, href: "#", tone: "muted" as const },
    { label: "Attendees", value: attendees, href: "#", tone: "muted" as const },
  ];

  const toneClass: Record<string, string> = {
    warning: "text-warning",
    success: "text-success",
    error: "text-error",
    info: "text-info",
    muted: "text-foreground",
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              {s.href !== "#" ? (
                <Link href={s.href} className="block">
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                  <p className={`mt-1 text-3xl font-bold ${toneClass[s.tone]}`}>
                    {s.value}
                  </p>
                </Link>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                  <p className="mt-1 text-3xl font-bold">{s.value}</p>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Needs review</h2>
          <Button asChild variant="outline" size="sm" className="tap-target">
            <Link href="/admin/review">Go to queue</Link>
          </Button>
        </div>
        {recent.length === 0 ? (
          <p className="rounded-lg border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
            Nothing in the review queue. Nicely done.
          </p>
        ) : (
          <div className="space-y-2">
            {recent.map((e) => (
              <div
                key={e.id}
                className="flex items-center justify-between rounded-lg border bg-card p-3"
              >
                <div>
                  <Link
                    href={`/events/${e.id}`}
                    className="font-medium hover:underline"
                  >
                    {e.title}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    by {e.organizer.name}
                  </p>
                </div>
                <Badge variant="warning">Submitted</Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
