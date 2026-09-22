import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { dbConnect } from "@/lib/db/mongoose";
import { User } from "@/models/User";
import { Organization } from "@/models/Organization";
import { ImpersonationSession } from "@/models/ImpersonationSession";
import { AuditLog } from "@/models/AuditLog";
import { getSession, signToken } from "@/lib/auth/session";

export async function POST() {
  try {
    const session = await getSession();

    if (!session || !session.isImpersonating || !session.originalSuperAdminId) {
      return NextResponse.json({ error: "No active impersonation session found" }, { status: 400 });
    }

    await dbConnect();

    // 1. Mark ImpersonationSession inactive
    if (session.impersonationSessionId) {
      await ImpersonationSession.findByIdAndUpdate(session.impersonationSessionId, {
        endedAt: new Date(),
        isActive: false,
      });
    }

    // 2. Log exit in AuditLog
    await AuditLog.create({
      organizationId: session.organizationId,
      userId: session.originalSuperAdminId,
      userName: "Super Admin",
      userRole: "super_admin",
      action: "SUPER_ADMIN_IMPERSONATE_EXIT",
      details: `Exited impersonation of tenant '${session.targetOrgName || session.orgName}'. Restored Super Admin portal session.`,
      ipAddress: "127.0.0.1",
    });

    // 3. Restore Super Admin user session
    const superAdminUser = await User.findById(session.originalSuperAdminId);
    let hqOrg = await Organization.findOne({ code: "rst-hq" });
    if (!hqOrg) {
      hqOrg = await Organization.findOne({});
    }

    const tokenPayload = {
      userId: superAdminUser?._id.toString() || session.originalSuperAdminId,
      organizationId: hqOrg?._id.toString() || session.organizationId,
      branchId: "",
      role: "super_admin",
      name: superAdminUser?.fullName || "Global Super Admin",
      email: superAdminUser?.email || "superadmin@rstpos.com",
      orgName: "RST POS HQ",
      orgCode: "rst-hq",
      businessType: "bakery",
      planTier: "billing_accounting",
    };

    const token = await signToken(tokenPayload);

    // 4. Set cookie back to Super Admin token
    const cookieStore = await cookies();
    cookieStore.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    return NextResponse.json({
      success: true,
      message: "Exited impersonation mode. Restored Super Admin portal session.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: process.env.NODE_ENV === "production" ? "Failed to exit impersonation" : error.message },
      { status: 500 }
    );
  }
}
