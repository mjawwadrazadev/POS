import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { BusinessType } from "@/lib/config/verticals";
import { dbConnect } from "@/lib/db/mongoose";
import { Organization } from "@/models/Organization";

// Fail-hard on startup if JWT_SECRET is missing — no silent fallback to any default.
// If this throws, it means the environment is misconfigured. Fix .env.local, do NOT add a fallback.
if (!process.env.JWT_SECRET) {
  throw new Error(
    "[FATAL] JWT_SECRET environment variable is not set. " +
    "Refusing to start with an insecure default. " +
    "Set a strong random secret in .env.local: JWT_SECRET=<your-random-64-char-hex>"
  );
}
const JWT_SECRET = process.env.JWT_SECRET;

export interface SessionPayload {
  userId: string;
  fullName: string;
  email: string;
  role: "super_admin" | "admin" | "manager" | "cashier";
  organizationId: string;
  organizationName?: string;
  businessType?: BusinessType;
  branchId?: string;
  branchName?: string;
  planTier?: "billing_only" | "billing_accounting";
  subscriptionStatus?: string;
}

export function signToken(payload: SessionPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "12h" });
}

export function verifyToken(token: string): SessionPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as SessionPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("rst_pos_token")?.value;
  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload) return null;

  // Live Subscription Status & Plan Tier Verification (Session Revocation Guard)
  // Non-super_admin requests always hit DB to catch mid-session suspension/expiry.
  if (payload.role !== "super_admin" && payload.organizationId) {
    try {
      await dbConnect();
      const org = await Organization.findById(payload.organizationId)
        .select("subscriptionStatus planTier")
        .lean();

      if (!org || org.subscriptionStatus === "suspended" || org.subscriptionStatus === "expired") {
        console.warn(
          `[Session Revoked] Access blocked for tenant '${payload.organizationId}' ` +
          `(Status: ${org?.subscriptionStatus || "org missing from DB"})`
        );
        return null;
      }

      payload.planTier = org.planTier || "billing_only";
      payload.subscriptionStatus = org.subscriptionStatus;
    } catch (err) {
      // Fail CLOSED: if the DB check cannot complete for any reason
      // (timeout, connection glitch, network issue), deny access.
      // Never grant a session on an unverified check.
      console.error("[Session Guard] DB lookup failed — denying access (fail-closed):", err);
      return null;
    }
  }

  return payload;
}
