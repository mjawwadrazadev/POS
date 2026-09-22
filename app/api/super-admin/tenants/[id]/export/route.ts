import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db/mongoose";
import { Organization } from "@/models/Organization";
import { Branch } from "@/models/Branch";
import { User } from "@/models/User";
import { Order } from "@/models/Order";
import { Product } from "@/models/Product";
import { PaymentHistory } from "@/models/PaymentHistory";
import { requireSuperAdminAction } from "@/lib/middleware/requireSuperAdminAction";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireSuperAdminAction("terminate_tenant");
    if (!auth.authorized) return auth.response;

    const { id } = await params;
    await dbConnect();

    const org = await Organization.findById(id).lean();
    if (!org) return NextResponse.json({ error: "Tenant organization not found" }, { status: 404 });

    const branches = await Branch.find({ organizationId: id }).lean();
    const users = await User.find({ organizationId: id }).select("-password -pin").lean();
    const orders = await Order.find({ organizationId: id }).lean();
    const products = await Product.find({ organizationId: id }).lean();
    const payments = await PaymentHistory.find({ organizationId: id }).lean();

    const exportBundle = {
      exportedAt: new Date().toISOString(),
      exportedBy: auth.session!.email,
      tenant: {
        organization: org,
        branches,
        users,
        productsCount: products.length,
        ordersCount: orders.length,
        paymentsCount: payments.length,
        products,
        orders,
        payments,
      },
    };

    return new Response(JSON.stringify(exportBundle, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="tenant-export-${org.code}-${Date.now()}.json"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: process.env.NODE_ENV === "production" ? "Failed to export tenant data" : error.message },
      { status: 500 }
    );
  }
}
