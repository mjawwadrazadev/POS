import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { BusinessType } from "@/lib/config/verticals";
import { dbConnect } from "@/lib/db/mongoose";
import { Organization } from "@/models/Organization";
import { User } from "@/models/User";
import { ImpersonationSession } from "@/models/ImpersonationSession";
import { getJwtSecret } from "@/lib/config/platformConfig";
import { isPlatformRole } from "@/lib/auth/permissions";

// The signing secret is read on every call (never cached at module load) so a rotation from the
// super admin Integrations tab takes effect immediately. It is never a hard-coded default:
// getJwtSecret() generates and saves a random one on first use.

// Single session cookie for every kind of session (tenant, platform, impersonation).
export const SESSION_COOKIE = "rst_pos_token";
// Legacy cookie written by older impersonation code — only ever cleared, never read.
const LEGACY_SESSION_COOKIE = "auth_token";

export const SESSION_MAX_AGE_SECONDS = 12 * 60 * 60;
export const IMPERSONATION_MAX_AGE_SECONDS = 30 * 60;

// Tenant statuses that must never be granted a session.
const BLOCKED_TENANT_STATUSES = ["suspended", "suspended_manual", "expired", "terminated"];

export type SessionRole = "super_admin" | "platform_support" | "admin" | "manager" | "cashier";

export interface SessionPayload {
  userId: string;
  fullName?: string;
  name?: string;
  email: string;
  role: SessionRole;
  organizationId: string;
  organizationName?: string;
  orgName?: string;
  orgCode?: string;
  businessType?: BusinessType;
  branchId?: string;
  branchName?: string;
  planTier?: "billing_only" | "billing_accounting";
  subscriptionStatus?: string;
  taxRate?: number;
  // Impersonation fields
  isImpersonating?: boolean;
  originalSuperAdminId?: string;
  impersonationSessionId?: string;
  targetOrgName?: string;
}

export { isPlatformRole };

export function signToken(payload: object, expiresInSeconds: number = SESSION_MAX_AGE_SECONDS): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: expiresInSeconds });
}

export function verifyToken(token: string): SessionPayload | null {
  try {
    return jwt.verify(token, getJwtSecret()) as SessionPayload;
  } catch {
    return null;
  }
}

export function setSessionCookie(response: NextResponse, token: string, maxAgeSeconds: number = SESSION_MAX_AGE_SECONDS) {
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: maxAgeSeconds,
    path: "/",
  });
  clearLegacyCookie(response);
}

export function clearSessionCookies(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  clearLegacyCookie(response);
}

function clearLegacyCookie(response: NextResponse) {
  response.cookies.set(LEGACY_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
}

/**
 * Reads the session cookie, verifies the JWT and re-validates it against the database on every call
 * (fail-closed). A token is only honoured while:
 *  - the user still exists, is active and still holds the role in the token
 *  - for tenant users: the organization is not suspended / expired / terminated and not past expiryDate
 *  - for impersonation: the ImpersonationSession is still active, unexpired, and the super admin is still active
 */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload) return null;

  try {
    await dbConnect();

    if (payload.isImpersonating) {
      if (!payload.impersonationSessionId || !payload.originalSuperAdminId) return null;

      const [imp, superAdmin] = await Promise.all([
        ImpersonationSession.findById(payload.impersonationSessionId).lean(),
        User.findById(payload.originalSuperAdminId).select("isActive role").lean(),
      ]);

      if (!imp || !imp.isActive || new Date(imp.expiresAt) <= new Date()) return null;
      if (imp.targetOrganizationId.toString() !== payload.organizationId) return null;
      if (!superAdmin || !superAdmin.isActive || superAdmin.role !== "super_admin") return null;

      const org = await Organization.findById(payload.organizationId).select("planTier taxRate subscriptionStatus").lean();
      if (!org) return null;
      payload.planTier = org.planTier || "billing_only";
      payload.taxRate = org.taxRate;
      payload.subscriptionStatus = org.subscriptionStatus;
      return payload;
    }

    const user = await User.findById(payload.userId).select("isActive role organizationId").lean();
    if (!user || !user.isActive || user.role !== payload.role) return null;

    if (isPlatformRole(payload.role)) {
      return payload;
    }

    if (!payload.organizationId || user.organizationId.toString() !== payload.organizationId) return null;

    const org = await Organization.findById(payload.organizationId)
      .select("subscriptionStatus planTier expiryDate taxRate")
      .lean();

    if (!org) return null;

    const isPastExpiry = org.expiryDate && new Date(org.expiryDate) < new Date();
    if (BLOCKED_TENANT_STATUSES.includes(org.subscriptionStatus) || isPastExpiry) {
      console.warn(
        `[Session Revoked] Access blocked for tenant '${payload.organizationId}' ` +
        `(Status: ${org.subscriptionStatus}${isPastExpiry ? ", past expiry date" : ""})`
      );
      return null;
    }

    payload.planTier = org.planTier || "billing_only";
    payload.subscriptionStatus = org.subscriptionStatus;
    payload.taxRate = org.taxRate;
    return payload;
  } catch (err) {
    // Fail CLOSED: if the DB check cannot complete for any reason, deny access.
    console.error("[Session Guard] DB lookup failed — denying access (fail-closed):", err);
    return null;
  }
}

export function isBlockedTenantStatus(status?: string) {
  return !!status && BLOCKED_TENANT_STATUSES.includes(status);
}
