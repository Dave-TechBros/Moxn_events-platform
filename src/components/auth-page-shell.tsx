import { prisma } from "@/lib/prisma";
import { EventsBrowser } from "@/components/events-browser";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const dynamic = "force-dynamic";

export async function AuthPageShell({ children }: { children: React.ReactNode }) {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
  });

  return (
    <div className="relative min-h-screen">
      {/* Landing page content in the background */}
      <div className="pointer-events-none select-none opacity-40">
        <div className="space-y-8 p-8">
          <section className="overflow-hidden rounded-lg border bg-gradient-to-br from-primary/10 via-background to-background p-8 md:p-12">
            <div className="max-w-2xl">
              <p className="mb-3 inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
                Live in your city, right now
              </p>
              <h1 className="text-3xl font-bold tracking-tight md:text-5xl">
                Discover what&apos;s happening near you.
              </h1>
              <p className="mt-3 text-lg text-muted-foreground">
                Find local events, grab a ticket in seconds, and walk in with a QR
                pass. No lines, no fuss — just show up.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button asChild size="lg" className="tap-target">
                  <Link href="#events">Browse events</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="tap-target">
                  <Link href="/register">List your event</Link>
                </Button>
              </div>
            </div>
          </section>
          <EventsBrowser initialCategories={categories} />
        </div>
      </div>

      {/* Dark overlay */}
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px]" />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {children}
      </div>
    </div>
  );
}
