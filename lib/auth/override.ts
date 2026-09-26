import { verifyToken } from "@/lib/auth/session";

export const OVERRIDE_TOKEN_PURPOSE = "discount_override";
export const OVERRIDE_TTL_SECONDS = 10 * 60;

// Discounts above this percentage need a manager/admin override token when requested by a cashier
export const MAX_UNAPPROVED_DISCOUNT_PERCENT = 10;

/** Validates a manager override token issued by /api/auth/verify-pin for this org and requester. */
export function verifyOverrideToken(token: unknown, organizationId: string, requestedBy: string): boolean {
  if (typeof token !== "string" || !token) return false;
  const payload = verifyToken(token) as any;
  return (
    !!payload &&
    payload.purpose === OVERRIDE_TOKEN_PURPOSE &&
    payload.organizationId === organizationId &&
    payload.requestedBy === requestedBy
  );
}
