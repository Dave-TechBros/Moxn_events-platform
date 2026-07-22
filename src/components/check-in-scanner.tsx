"use client";

import * as React from "react";
import { toast } from "sonner";
import { Camera, Square, CheckCircle2, XCircle, Loader2, Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ScanResult = {
  ok: boolean;
  already: boolean;
  message: string;
  attendee?: {
    name: string;
    email: string;
    ticketType: string;
    quantity: number;
    event: string;
    checkedInAt?: string;
  };
};

export function CheckInScanner() {
  const [scanning, setScanning] = React.useState(false);
  const [manual, setManual] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [result, setResult] = React.useState<ScanResult | null>(null);
  const [history, setHistory] = React.useState<ScanResult[]>([]);
  const [camError, setCamError] = React.useState<string | null>(null);
  const readerRef = React.useRef<HTMLDivElement>(null);
  const scannerRef = React.useRef<any>(null);

  async function validate(token: string) {
    if (!token.trim()) return;
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token.trim() }),
      });
      const d = await res.json();
      let r: ScanResult;
      if (res.ok && (d.ok || d.alreadyCheckedIn)) {
        r = {
          ok: true,
          already: !!d.alreadyCheckedIn,
          message: d.alreadyCheckedIn
            ? "Already checked in"
            : "Checked in successfully",
          attendee: d.attendee,
        };
      } else {
        r = { ok: false, already: false, message: d.error || "Invalid pass" };
      }
      setResult(r);
      setHistory((h) => [r, ...h].slice(0, 8));
      if (r.ok && !r.already) toast.success("Checked in!");
      else if (r.already) toast.message("Already checked in");
      else toast.error(r.message);
    } catch {
      const r = { ok: false, already: false, message: "Network error" };
      setResult(r);
      setHistory((h) => [r, ...h].slice(0, 8));
    } finally {
      setBusy(false);
    }
  }

  async function startCamera() {
    setCamError(null);
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      if (!readerRef.current) return;
      const scanner = new Html5Qrcode("checkin-reader");
      scannerRef.current = scanner;
      setScanning(true);
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 260 },
        async (decoded: string) => {
          await scanner.stop();
          setScanning(false);
          scannerRef.current = null;
          validate(decoded);
        },
        () => {
          /* ignore per-frame errors */
        }
      );
    } catch {
      setScanning(false);
      setCamError(
        "Camera unavailable. Allow camera access, or use manual entry below."
      );
    }
  }

  async function stopCamera() {
    try {
      if (scannerRef.current) {
        await scannerRef.current.stop();
        scannerRef.current = null;
      }
    } catch {
      /* ignore */
    }
    setScanning(false);
  }

  React.useEffect(() => {
    return () => {
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <h3 className="mb-2 font-semibold">Scan a pass</h3>
          <div
            id="checkin-reader"
            ref={readerRef}
            className="mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-md bg-black/90"
            aria-label="Camera preview for scanning QR passes"
          />
          {scanning ? (
            <Button
              variant="destructive"
              className="mt-3 w-full tap-target"
              onClick={stopCamera}
            >
              <Square className="h-4 w-4" /> Stop camera
            </Button>
          ) : (
            <Button
              className="mt-3 w-full tap-target"
              onClick={startCamera}
            >
              <Camera className="h-4 w-4" /> Start camera
            </Button>
          )}
          {camError && (
            <p className="mt-2 text-sm text-warning">{camError}</p>
          )}
        </div>

        {/* Manual entry — accessible fallback & for pasted codes. */}
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <h3 className="mb-2 flex items-center gap-2 font-semibold">
            <Keyboard className="h-4 w-4" /> Manual entry
          </h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              validate(manual);
            }}
            className="space-y-2"
          >
            <Label htmlFor="manual">Paste or type the code</Label>
            <Input
              id="manual"
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              placeholder="MOXN:… or full code"
              autoComplete="off"
            />
            <Button
              type="submit"
              variant="outline"
              className="w-full tap-target"
              disabled={busy}
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Validate pass"
              )}
            </Button>
          </form>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <h3 className="mb-3 font-semibold">Result</h3>
          {!result && (
            <p className="text-sm text-muted-foreground">
              Scan or enter a pass to validate entry in real time.
            </p>
          )}
          {result && (
            <div
              className={
                result.ok
                  ? "rounded-md bg-success/10 p-4 text-success"
                  : "rounded-md bg-error/10 p-4 text-error"
              }
            >
              <div className="flex items-center gap-2 font-semibold">
                {result.ok ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <XCircle className="h-5 w-5" />
                )}
                {result.message}
              </div>
              {result.attendee && (
                <dl className="mt-3 space-y-1 text-sm text-foreground">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Name</dt>
                    <dd className="font-medium">{result.attendee.name}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Ticket</dt>
                    <dd className="font-medium">
                      {result.attendee.ticketType} ×{result.attendee.quantity}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Event</dt>
                    <dd className="font-medium">{result.attendee.event}</dd>
                  </div>
                </dl>
              )}
            </div>
          )}
        </div>

        {history.length > 0 && (
          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <h3 className="mb-2 font-semibold">Recent scans</h3>
            <ul className="space-y-1 text-sm">
              {history.map((h, i) => (
                <li key={i} className="flex items-center gap-2">
                  {h.ok ? (
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  ) : (
                    <XCircle className="h-4 w-4 text-error" />
                  )}
                  <span className="truncate">
                    {h.attendee?.name ?? h.message}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
