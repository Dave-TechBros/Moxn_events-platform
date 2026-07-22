import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validation";
import { hashPassword, setSessionCookie } from "@/lib/auth";
import { json, errorResponse, handleError } from "@/lib/api";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = registerSchema.parse(body);
    const existing = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });
    if (existing) {
      return errorResponse("An account with that email already exists.", 409);
    }
    const user = await prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        name: data.name,
        passwordHash: await hashPassword(data.password),
        role: data.role,
      },
      select: { id: true, name: true, email: true, role: true },
    });
    await setSessionCookie(user);
    return json({ user }, 201);
  } catch (e) {
    return handleError(e);
  }
}
