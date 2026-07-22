import { CheckInScanner } from "@/components/check-in-scanner";

export const dynamic = "force-dynamic";

export default function AdminCheckInPage() {
  return (
    <div>
      <h2 className="mb-1 text-lg font-semibold">Door check-in</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Scan attendee QR passes at the door. Each pass validates once.
      </p>
      <CheckInScanner />
    </div>
  );
}
