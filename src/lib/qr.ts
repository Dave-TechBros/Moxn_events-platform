import QRCode from "qrcode";

/**
 * The QR pass encodes a compact, unforgeable token. Validation happens
 * server-side by looking the token up in the database, so the code itself
 * carries no secrets — it is just an opaque reference.
 */
export const QR_PREFIX = "MOXN:";

export function qrPayload(token: string): string {
  return `${QR_PREFIX}${token}`;
}

export function extractToken(scanned: string): string | null {
  if (!scanned) return null;
  const t = scanned.trim();
  if (t.startsWith(QR_PREFIX)) return t.slice(QR_PREFIX.length);
  // tolerate a full URL form like /checkin?t=...
  const match = t.match(/[?&]t=([^&\s]+)/);
  if (match) return match[1];
  return t;
}

export async function generateQrDataUrl(token: string): Promise<string> {
  return QRCode.toDataURL(qrPayload(token), {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 320,
    color: { dark: "#0a0a0a", light: "#ffffff" },
  });
}
