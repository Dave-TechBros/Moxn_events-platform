import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validation";
import { verifyPassword, setSessionCookie, logger } from "@/lib/auth";
import { json, errorResponse, handleError } from "@/lib/api";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = loginSchema.parse(body);
    const user = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });
    if (!user || !(await verifyPassword(data.password, user.passwordHash))) {
      logger.auth.failure({ email: data.email.toLowerCase() });
      return errorResponse("Invalid email or password.", 401);
    }
    await setSessionCookie(user);
    logger.auth.login({ userId: user.id, role: user.role });
    return json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (e) {
    return handleError(e);
  }
}
