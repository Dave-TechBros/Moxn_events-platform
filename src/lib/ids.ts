import crypto from "node:crypto";

// Opaque, unguessable token for QR passes (unique per registration).
export function randomCuid(): string {
  return crypto.randomBytes(18).toString("base64url");
}
