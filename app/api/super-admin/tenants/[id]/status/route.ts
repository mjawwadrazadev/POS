import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db/mongoose";
import { Organization } from "@/models/Organization";
import { AuditLog } from "@/models/AuditLog";
import { requireSuperAdminAction } from "@/lib/middleware/requireSuperAdminAction";
import { getClientIp } from "@/lib/utils/server";

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

    if (org.subscriptionStatus === "terminated") {
      return NextResponse.json({ error: "Terminated tenants cannot be reactivated from here" }, { status: 400 });
    }
    if (status === "active" && org.expiryDate && new Date(org.expiryDate) < new Date()) {
      return NextResponse.json(
        { error: "Subscription has expired — record a payment to extend access instead of reactivating" },
        { status: 400 }
      );
    }

    const oldStatus = org.subscriptionStatus;
    org.subscriptionStatus = status;
    await org.save();

    await AuditLog.create({
      organizationId: org._id,
      actorId: auth.session!.userId,
      actorName: auth.session!.fullName || auth.session!.name || auth.session!.email,
      actorRole: auth.session!.role,
      action: status === "suspended_manual" ? "TENANT_MANUAL_SUSPEND" : "TENANT_REACTIVATE",
      targetCollection: "Organization",
      targetId: org._id,
      before: { status: oldStatus },
      after: { status, reason },
      ipAddress: getClientIp(req),
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
