import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db/mongoose";
import { Organization } from "@/models/Organization";
import { AuditLog } from "@/models/AuditLog";
import { requireSuperAdminAction } from "@/lib/middleware/requireSuperAdminAction";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireSuperAdminAction("suspend_tenant");
    if (!auth.authorized) return auth.response;

    const { id } = await params;
    await dbConnect();

    const body = await req.json();
    const { status, reason = "" } = body;

    const allowedStatuses = ["active", "suspended_manual"];
    if (!status || !allowedStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Allowed status values for this endpoint: 'active', 'suspended_manual'" },
        { status: 400 }
      );
    }

    const org = await Organization.findById(id);
    if (!org) {
      return NextResponse.json({ error: "Tenant organization not found" }, { status: 404 });
    }

    const oldStatus = org.subscriptionStatus;
    org.subscriptionStatus = status;
    await org.save();

    await AuditLog.create({
      organizationId: org._id,
      userId: auth.session!.userId,
      userName: auth.session!.name || "Super Admin",
      userRole: auth.session!.role,
      action: status === "suspended_manual" ? "TENANT_MANUAL_SUSPEND" : "TENANT_REACTIVATE",
      details: `Changed status of '${org.name}' from ${oldStatus} to ${status}. Reason: ${reason || "N/A"}`,
      ipAddress: "127.0.0.1",
    });

    return NextResponse.json({
      success: true,
      message: `Tenant '${org.name}' status updated to '${status}'.`,
      tenant: {
        id: org._id.toString(),
        name: org.name,
        status: org.subscriptionStatus,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: process.env.NODE_ENV === "production" ? "Failed to update tenant status" : error.message },
      { status: 500 }
    );
  }
}
