import { NextRequest } from "next/server";
import { requireRole, logger } from "@/lib/auth";
import { confirmHold } from "@/lib/capacity";
import { json, handleError } from "@/lib/api";

// Step 2: confirm the hold -> issue the ticket (mock payment completed).
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireRole(["ATTENDEE", "ORGANIZER", "ADMIN"])();
    const registration = await confirmHold(params.id, user.id);
    logger.registration.confirm({
      userId: user.id,
      registrationId: registration.id,
    });
    return json({
      registration: {
        id: registration.id,
        status: registration.status,
        qrToken: registration.qrToken,
        confirmedAt: registration.confirmedAt,
      },
    });
  } catch (e) {
    return handleError(e);
  }
}
