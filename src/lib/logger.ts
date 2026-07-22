/**
 * Minimal structured logger focused on the failure-critical paths:
 * registration and check-in. Swaps to a real sink (e.g. Datadog, Logtail)
 * in production via the LOG_DEST env var if needed.
 */
type Level = "info" | "warn" | "error";

function emit(
  level: Level,
  scope: string,
  message: string,
  meta?: Record<string, unknown>
) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    scope,
    message,
    ...meta,
  };
  if (level === "error") {
    // eslint-disable-next-line no-console
    console.error(JSON.stringify(entry));
  } else if (level === "warn") {
    // eslint-disable-next-line no-console
    console.warn(JSON.stringify(entry));
  } else {
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(entry));
  }
}

export const logger = {
  registration: {
    hold: (meta: Record<string, unknown>) =>
      emit("info", "registration.hold", "hold reserved", meta),
    holdFailed: (meta: Record<string, unknown>) =>
      emit("warn", "registration.hold", "hold failed", meta),
    confirm: (meta: Record<string, unknown>) =>
      emit("info", "registration.confirm", "ticket confirmed", meta),
    cancel: (meta: Record<string, unknown>) =>
      emit("info", "registration.cancel", "registration cancelled", meta),
  },
  checkin: {
    scan: (meta: Record<string, unknown>) =>
      emit("info", "checkin.scan", "pass scanned", meta),
    success: (meta: Record<string, unknown>) =>
      emit("info", "checkin.success", "attendee checked in", meta),
    rejected: (meta: Record<string, unknown>) =>
      emit("warn", "checkin.reject", "pass rejected", meta),
  },
  auth: {
    login: (meta: Record<string, unknown>) =>
      emit("info", "auth.login", "login", meta),
    failure: (meta: Record<string, unknown>) =>
      emit("warn", "auth.failure", "auth failure", meta),
  },
};
