import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db/mongoose";
import { Organization } from "@/models/Organization";
import { User } from "@/models/User";
import { AuditLog } from "@/models/AuditLog";
import { requireSuperAdminAction } from "@/lib/middleware/requireSuperAdminAction";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireSuperAdminAction("terminate_tenant");
    if (!auth.authorized) return auth.response;

    const { id } = await params;
    await dbConnect();

    const body = await req.json();
    const { confirmTenantName, reason } = body;

    if (!confirmTenantName || !reason) {
      return NextResponse.json(
        { error: "Confirmation tenant name and reason are required for termination" },
        { status: 400 }
      );
    }

    const org = await Organization.findById(id);
    if (!org) {
      return NextResponse.json({ error: "Tenant organization not found" }, { status: 404 });
    }

    if (org.name.trim().toLowerCase() !== confirmTenantName.trim().toLowerCase()) {
      return NextResponse.json(
        { error: `Confirmation tenant name '${confirmTenantName}' does not match target tenant name '${org.name}'` },
        { status: 400 }
      );
    }

    // Update status to terminated
    org.subscriptionStatus = "terminated";
    await org.save();

    // Deactivate all users under this tenant
    await User.updateMany({ organizationId: org._id }, { isActive: false });

    await AuditLog.create({
      organizationId: org._id,
      userId: auth.session!.userId,
      userName: auth.session!.name || "Super Admin",
      userRole: auth.session!.role,
      action: "TENANT_TERMINATED",
      details: `OFFBOARDING: Terminated tenant '${org.name}' (${org.code}). All tenant users deactivated. Reason: ${reason}`,
      ipAddress: "127.0.0.1",
    });

    return NextResponse.json({
      success: true,
      message: `Tenant '${org.name}' has been terminated and offboarded successfully.`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: process.env.NODE_ENV === "production" ? "Failed to terminate tenant" : error.message },
      { status: 500 }
    );
  }
}
