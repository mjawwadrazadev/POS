import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/db/mongoose";
import { Organization } from "@/models/Organization";
import { User } from "@/models/User";
import { ImpersonationSession } from "@/models/ImpersonationSession";
import { requireSuperAdminAction } from "@/lib/middleware/requireSuperAdminAction";
import { signToken, setSessionCookie, IMPERSONATION_MAX_AGE_SECONDS, SessionPayload } from "@/lib/auth/session";
import { logAudit } from "@/lib/audit/logger";
import { getClientIp } from "@/lib/utils/server";

export async function POST(req: Request) {
  try {
    const auth = await requireSuperAdminAction("impersonate_tenant");
    if (!auth.authorized) return auth.response;
    const superAdmin = auth.session!;

    if (superAdmin.isImpersonating) {
      return NextResponse.json({ error: "Exit the current impersonation session first" }, { status: 400 });
    }

    await dbConnect();
    const { organizationId, reason } = await req.json();

    if (!mongoose.isValidObjectId(organizationId) || !reason || String(reason).trim().length < 5) {
      return NextResponse.json(
        { error: "Organization ID and a detailed reason (at least 5 characters) are mandatory for impersonation" },
        { status: 400 }
      );
    }

    const targetOrg = await Organization.findById(organizationId);
    if (!targetOrg) return NextResponse.json({ error: "Target organization not found" }, { status: 404 });
    if (targetOrg.subscriptionStatus === "terminated") {
      return NextResponse.json({ error: "Cannot impersonate a terminated tenant" }, { status: 400 });
    }

    const targetUser = await User.findOne({ organizationId, role: "admin", isActive: true });
    if (!targetUser) {
      return NextResponse.json({ error: "No active admin user found for target organization" }, { status: 404 });
    }

    // Close any impersonation sessions this super admin left open
    await ImpersonationSession.updateMany(
      { superAdminId: superAdmin.userId, isActive: true },
      { $set: { isActive: false, endedAt: new Date() } }
    );

    const now = new Date();
    const expiresAt = new Date(now.getTime() + IMPERSONATION_MAX_AGE_SECONDS * 1000);

    const impersonation = await ImpersonationSession.create({
      superAdminId: superAdmin.userId,
      targetOrganizationId: targetOrg._id,
      targetUserId: targetUser._id,
      reason: String(reason).trim(),
      startedAt: now,
      expiresAt,
      isActive: true,
    });

    await logAudit({
      organizationId: targetOrg._id as any,
      actorId: superAdmin.userId,
      actorName: superAdmin.fullName || superAdmin.name || superAdmin.email,
      actorRole: superAdmin.role,
      action: "SUPER_ADMIN_IMPERSONATE_START",
      targetCollection: "ImpersonationSession",
      targetId: impersonation._id as any,
      after: { reason, targetOrgCode: targetOrg.code, expiresAt },
      ipAddress: getClientIp(req),
    });

    const tokenPayload: SessionPayload = {
      userId: (targetUser._id as any).toString(),
      organizationId: (targetOrg._id as any).toString(),
      branchId: targetUser.branchId ? targetUser.branchId.toString() : undefined,
      role: "admin",
      fullName: targetUser.fullName,
      email: targetUser.email,
      organizationName: targetOrg.name,
      orgCode: targetOrg.code,
      businessType: targetOrg.businessType,
      planTier: targetOrg.planTier || "billing_only",
      isImpersonating: true,
      originalSuperAdminId: superAdmin.userId,
      impersonationSessionId: (impersonation._id as any).toString(),
      targetOrgName: targetOrg.name,
    };

    // The token itself expires with the impersonation window (not the normal 12h)
    const response = NextResponse.json({
      success: true,
      message: `Now impersonating '${targetOrg.name}'. Session expires in 30 minutes.`,
      targetOrgName: targetOrg.name,
    });
    setSessionCookie(response, signToken(tokenPayload, IMPERSONATION_MAX_AGE_SECONDS), IMPERSONATION_MAX_AGE_SECONDS);
    return response;
  } catch (error: any) {
    return NextResponse.json(
      { error: process.env.NODE_ENV === "production" ? "Failed to start impersonation" : error.message },
      { status: 500 }
    );
  }
}
