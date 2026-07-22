import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { generateQrDataUrl } from "@/lib/qr";
import { json, errorResponse, handleError } from "@/lib/api";

export const dynamic = "force-dynamic";

// Reveal the QR pass for a confirmed registration.
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return errorResponse("Sign in required.", 401);
    const reg = await prisma.registration.findUnique({
      where: { id: params.id },
      include: { event: { select: { title: true, status: true } } },
    });
    if (!reg || reg.userId !== user.id) {
      return errorResponse("Registration not found.", 404);
    }
    if (reg.status !== "CONFIRMED") {
      return errorResponse("Ticket is not confirmed yet.", 409);
    }
    if (reg.event.status === "CANCELLED") {
      return errorResponse("This event was cancelled.", 409);
    }
    const dataUrl = await generateQrDataUrl(reg.qrToken);
    return json({ qr: dataUrl, token: reg.qrToken });
  } catch (e) {
    return handleError(e);
  }
}
