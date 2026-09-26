import crypto from "crypto";

/**
 * Best-effort client IP for audit logs and rate-limit keys.
 * These headers are only trustworthy behind a proxy that overwrites them, so never
 * rely on the IP alone for security decisions — always combine with another key.
 */
export function getClientIp(req: Request): string {
  return (
    req.headers.get("x-real-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

/** Collision-resistant human readable document number, e.g. ORD-260926-4F9A1C */
export function generateDocNumber(prefix: string): string {
  const now = new Date();
  const datePart =
    String(now.getFullYear()).slice(-2) +
    String(now.getMonth() + 1).padStart(2, "0") +
    String(now.getDate()).padStart(2, "0");
  return `${prefix}-${datePart}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
}

export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function isValidPin(pin: unknown): pin is string {
  return typeof pin === "string" && /^\d{4}$/.test(pin);
}

export function generateTempPassword(): string {
  return crypto.randomBytes(9).toString("base64url");
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}
