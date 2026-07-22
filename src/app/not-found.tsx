import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <p className="text-5xl font-black text-muted-foreground">404</p>
      <h1 className="mt-2 text-2xl font-bold">Page not found</h1>
      <p className="mt-2 text-muted-foreground">
        That event or page doesn&apos;t exist (or isn&apos;t public yet).
      </p>
      <Button asChild className="mt-6 tap-target">
        <Link href="/">Back to events</Link>
      </Button>
    </div>
  );
}
