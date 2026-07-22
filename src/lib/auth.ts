import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { ROLES, type Role } from "@/lib/constants";
import { logger } from "@/lib/logger";

export { logger };

const SESSION_COOKIE = "moxn_session";
const SECRET = process.env.SESSION_SECRET || "dev-secret";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function sign(payload: string): string {
  return base64url(
    crypto.createHmac("sha256", SECRET).update(payload).digest()
  );
}

export type SessionData = {
  uid: string;
  role: Role;
  exp: number;
};

export function createSessionToken(user: {
  id: string;
  role: string;
}): string {
  const payload: SessionData = {
    uid: user.id,
    role: user.role as Role,
    exp: Date.now() + MAX_AGE * 1000,
  };
  const enc = base64url(JSON.stringify(payload));
  return `${enc}.${sign(enc)}`;
}

export async function setSessionCookie(user: {
  id: string;
  role: string;
}): Promise<void> {
  const token = createSessionToken({ id: user.id, role: user.role as Role });
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export function clearSessionCookie(): void {
  cookies().delete(SESSION_COOKIE);
}

export function parseSessionToken(
  token: string | undefined
): SessionData | null {
  if (!token) return null;
  const [enc, sig] = token.split(".");
  if (!enc || !sig) return null;
  const expected = sign(enc);
  // constant-time compare
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(
      Buffer.from(enc, "base64").toString("utf8")
    ) as SessionData;
    if (data.exp < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  const data = parseSessionToken(token);
  if (!data) return null;
  const user = await prisma.user.findUnique({
    where: { id: data.uid },
    select: { id: true, name: true, email: true, role: true },
  });
  if (!user) return null;
  return { ...user, role: user.role as Role };
}

export function isRole(role: Role, allowed: Role[]): boolean {
  return allowed.includes(role);
}

export function requireRole(allowed: Role[]) {
  return async (): Promise<CurrentUser> => {
    const user = await getCurrentUser();
    if (!user) {
      throw new AuthError("UNAUTHENTICATED", "You must be signed in.");
    }
    if (!allowed.includes(user.role)) {
      throw new AuthError(
        "FORBIDDEN",
        "You do not have permission to do that."
      );
    }
    return user;
  };
}

export class AuthError extends Error {
  code: "UNAUTHENTICATED" | "FORBIDDEN";
  constructor(code: "UNAUTHENTICATED" | "FORBIDDEN", message: string) {
    super(message);
    this.code = code;
  }
}

export { ROLES };
