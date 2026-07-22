import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AuthError } from "@/lib/auth";
import { CapacityError } from "@/lib/capacity";

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function errorResponse(message: string, status = 400, extra?: unknown) {
  return NextResponse.json(
    { error: message, ...(extra ? { details: extra } : {}) },
    { status }
  );
}

export function handleError(e: unknown) {
  if (e instanceof ZodError) {
    return errorResponse("Validation failed", 422, e.flatten().fieldErrors);
  }
  if (e instanceof AuthError) {
    return errorResponse(e.message, e.code === "UNAUTHENTICATED" ? 401 : 403);
  }
  if (e instanceof CapacityError) {
    return errorResponse(e.message, 409);
  }
  // eslint-disable-next-line no-console
  console.error("Unhandled API error:", e);
  const msg = e instanceof Error ? e.message : "Something went wrong";
  return errorResponse(msg, 500);
}
