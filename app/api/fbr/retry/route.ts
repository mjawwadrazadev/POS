import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/db/mongoose";
import { getSession } from "@/lib/auth/session";
import { isStoreManagerRole } from "@/lib/auth/permissions";
import { Order } from "@/models/Order";
import { getActiveFbrSettings, reportOrderToFbr } from "@/lib/fbr/client";

const MAX_BATCH = 25;

/**
 * Resends orders that FBR has not accepted yet.
 * Body: { orderId?: string } — one order, or the oldest failed orders of the store when omitted.
 */
export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!isStoreManagerRole(session.role)) {
      return NextResponse.json({ error: "Forbidden — Manager or Admin required" }, { status: 403 });
    }

    await dbConnect();
    const settings = await getActiveFbrSettings(session.organizationId);
    if (!settings) {
      return NextResponse.json({ error: "FBR integration is not enabled for this store" }, { status: 400 });
    }

    const { orderId } = await req.json().catch(() => ({}));
    const filter: any = { organizationId: session.organizationId, "fbr.status": { $in: ["failed", "pending"] } };
    if (orderId) {
      if (!mongoose.isValidObjectId(orderId)) return NextResponse.json({ error: "Invalid order" }, { status: 400 });
      filter._id = orderId;
    }

    const orders = await Order.find(filter).sort({ createdAt: 1 }).limit(orderId ? 1 : MAX_BATCH);
    let reported = 0;
    const errors: { orderNumber: string; error?: string }[] = [];
    for (const order of orders) {
      const result = await reportOrderToFbr(order, settings);
      if (result.fbr?.status === "reported") reported++;
      else errors.push({ orderNumber: order.orderNumber, error: result.fbr?.error });
    }

    const remaining = await Order.countDocuments({ organizationId: session.organizationId, "fbr.status": { $in: ["failed", "pending"] } });
    return NextResponse.json({ success: true, attempted: orders.length, reported, errors, remaining });
  } catch (error: any) {
    return NextResponse.json(
      { error: process.env.NODE_ENV === "production" ? "Failed to resend to FBR" : error.message },
      { status: 500 }
    );
  }
}
