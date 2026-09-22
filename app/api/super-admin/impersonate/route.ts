import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { dbConnect } from "@/lib/db/mongoose";
import { Organization } from "@/models/Organization";
import { User } from "@/models/User";
import { ImpersonationSession } from "@/models/ImpersonationSession";
import { AuditLog } from "@/models/AuditLog";
import { requireSuperAdminAction } from "@/lib/middleware/requireSuperAdminAction";
import { signToken } from "@/lib/auth/session";

export async function POST(req: Request) {
  try {
    const auth = await requireSuperAdminAction("impersonate_tenant");
    if (!auth.authorized) return auth.response;

    await dbConnect();
    const body = await req.json();
    const { organizationId, reason } = body;

    if (!organizationId || !reason || reason.trim().length < 5) {
      return NextResponse.json(
        { error: "Organization ID and a detailed reason (at least 5 characters) are mandatory for impersonation" },
        { status: 400 }
      );
    }

    const targetOrg = await Organization.findById(organizationId);
    if (!targetOrg) {
      return NextResponse.json({ error: "Target organization not found" }, { status: 404 });
    }

    // Find tenant admin user
    const targetUser = await User.findOne({ organizationId, role: "admin" }).select("+pin");
    if (!targetUser) {
      return NextResponse.json({ error: "No admin user found for target organization" }, { status: 404 });
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes hard cap

    // 1. Create ImpersonationSession record
    const impersonation = await ImpersonationSession.create({
      superAdminId: auth.session!.userId,
      targetOrganizationId: targetOrg._id,
      targetUserId: targetUser._id,
      reason,
      startedAt: now,
      expiresAt,
      isActive: true,
    });

    // 2. Log in AuditLog
    await AuditLog.create({
      organizationId: targetOrg._id,
      actorId: auth.session!.userId,
      actorName: auth.session!.name || auth.session!.fullName || auth.session!.email,
      actorRole: auth.session!.role,
      action: "SUPER_ADMIN_IMPERSONATE_START",
      targetCollection: "ImpersonationSession",
      targetId: impersonation._id,
      after: { reason, targetOrgCode: targetOrg.code, expiresAt },
      ipAddress: "127.0.0.1",
    });

    // 3. Create impersonation JWT payload
    const tokenPayload = {
      userId: targetUser._id.toString(),
      organizationId: targetOrg._id.toString(),
      branchId: targetUser.branchId ? targetUser.branchId.toString() : "",
      role: "admin",
      name: targetUser.fullName,
      email: targetUser.email,
      orgName: targetOrg.name,
      orgCode: targetOrg.code,
      businessType: targetOrg.businessType,
      planTier: targetOrg.planTier || "billing_accounting",
      // Impersonation flags
      isImpersonating: true,
      originalSuperAdminId: auth.session!.userId,
      impersonationSessionId: impersonation._id.toString(),
      impersonationExpiresAt: expiresAt.toISOString(),
      targetOrgName: targetOrg.name,
    };

    const token = await signToken(tokenPayload);

    // 4. Set session cookie
    const cookieStore = await cookies();
    cookieStore.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 60, // 30 minutes max age
      path: "/",
    });

    return NextResponse.json({
      success: true,
      message: `Now impersonating '${targetOrg.name}'. Session expires in 30 minutes.`,
      targetOrgName: targetOrg.name,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: process.env.NODE_ENV === "production" ? "Failed to start impersonation" : error.message },
      { status: 500 }
    );
  }
}
