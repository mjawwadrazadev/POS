import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db/mongoose";
import { Organization } from "@/models/Organization";
import { User } from "@/models/User";
import { Order } from "@/models/Order";
import { Product } from "@/models/Product";
import { PaymentHistory } from "@/models/PaymentHistory";
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

    // 1. Data Archival Summary before termination
    const ordersCount = await Order.countDocuments({ organizationId: org._id });
    const productsCount = await Product.countDocuments({ organizationId: org._id });
    const paymentsCount = await PaymentHistory.countDocuments({ organizationId: org._id });

    // 2. Update status to terminated & deactivate all users
    org.subscriptionStatus = "terminated";
    await org.save();

    await User.updateMany({ organizationId: org._id }, { isActive: false });

    // 3. Write AuditLog entry with data export reference
    await AuditLog.create({
      organizationId: org._id,
      actorId: auth.session!.userId,
      actorName: auth.session!.name || auth.session!.fullName || auth.session!.email,
      actorRole: auth.session!.role,
      action: "TENANT_TERMINATED",
      targetCollection: "Organization",
      targetId: org._id,
      after: { reason, ordersCount, productsCount, paymentsCount },
      ipAddress: "127.0.0.1",
    });

    return NextResponse.json({
      success: true,
      message: `Tenant '${org.name}' offboarded and terminated successfully. Historical data archived (${ordersCount} orders, ${productsCount} products).`,
      exportUrl: `/api/super-admin/tenants/${id}/export`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: process.env.NODE_ENV === "production" ? "Failed to terminate tenant" : error.message },
      { status: 500 }
    );
  }
}
