import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { dbConnect } from "@/lib/db/mongoose";
import { User } from "@/models/User";
import { Organization } from "@/models/Organization";
import { ImpersonationSession } from "@/models/ImpersonationSession";
import {
  verifyToken,
  signToken,
  setSessionCookie,
  clearSessionCookies,
  SESSION_COOKIE,
  SessionPayload,
} from "@/lib/auth/session";
import { logAudit } from "@/lib/audit/logger";
import { getClientIp } from "@/lib/utils/server";

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    // Read the raw token (not getSession) so an already-expired impersonation window can still be closed cleanly
    const session = token ? verifyToken(token) : null;

    if (!session || !session.isImpersonating || !session.originalSuperAdminId) {
      const response = NextResponse.json(
        { error: "No active impersonation session found", redirectTo: "/super-admin/login" },
        { status: 400 }
      );
      clearSessionCookies(response);
      return response;
    }

    await dbConnect();

    if (session.impersonationSessionId) {
      await ImpersonationSession.updateOne(
        { _id: session.impersonationSessionId, isActive: true },
        { $set: { endedAt: new Date(), isActive: false } }
      );
    }

    await logAudit({
      organizationId: session.organizationId,
      actorId: session.originalSuperAdminId,
      actorName: session.fullName ? `Super Admin (as ${session.fullName})` : "Super Admin",
      actorRole: "super_admin",
      action: "SUPER_ADMIN_IMPERSONATE_EXIT",
      targetCollection: "ImpersonationSession",
      targetId: session.impersonationSessionId,
      after: { targetOrgName: session.targetOrgName },
      ipAddress: getClientIp(req),
    });

    // Only restore platform access if the super admin account is still valid
    const superAdminUser = await User.findById(session.originalSuperAdminId);
    if (!superAdminUser || !superAdminUser.isActive || superAdminUser.role !== "super_admin") {
      const response = NextResponse.json(
        { error: "Super Admin account is no longer active", redirectTo: "/super-admin/login" },
        { status: 403 }
      );
      clearSessionCookies(response);
      return response;
    }

    const hqOrg = await Organization.findById(superAdminUser.organizationId).select("name code").lean();

    const tokenPayload: SessionPayload = {
      userId: (superAdminUser._id as any).toString(),
      fullName: superAdminUser.fullName,
      email: superAdminUser.email,
      role: "super_admin",
      organizationId: superAdminUser.organizationId.toString(),
      organizationName: hqOrg?.name,
      orgCode: hqOrg?.code,
    };

    const response = NextResponse.json({
      success: true,
      message: "Exited impersonation mode. Restored Super Admin portal session.",
      redirectTo: "/super-admin",
    });
    setSessionCookie(response, signToken(tokenPayload));
    return response;
  } catch (error: any) {
    return NextResponse.json(
      { error: process.env.NODE_ENV === "production" ? "Failed to exit impersonation" : error.message },
      { status: 500 }
    );
  }
}
