import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/db/mongoose";
import { KotTicket } from "@/models/KotTicket";
import { Order } from "@/models/Order";
import { getSession } from "@/lib/auth/session";
import { resolveBranch } from "@/lib/tenant/resolveBranch";

// Must match the KotTicket model enum
const KOT_STATUSES = ["queued", "preparing", "ready", "served"];
const PRIORITIES = ["normal", "rush"];
const ORDER_TYPES = ["dine_in", "takeaway", "delivery", "retail_sale", "prescription"];

export async function GET(req: Request) {
  try {
    await dbConnect();
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const query: any = { organizationId: session.organizationId };
    query.status = status && KOT_STATUSES.includes(status) ? status : { $ne: "served" };

    const tickets = await KotTicket.find(query).sort({ createdAt: 1 });
    return NextResponse.json({ success: true, count: tickets.length, tickets });
  } catch (error: any) {
    return NextResponse.json(
      { error: process.env.NODE_ENV === "production" ? "Failed to fetch KOT tickets" : error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { orderId, tableNumber, orderType = "dine_in", items, priority = "normal" } = await req.json();

    if (!PRIORITIES.includes(priority) || !ORDER_TYPES.includes(orderType)) {
      return NextResponse.json({ error: "Invalid priority or order type" }, { status: 400 });
    }

    const branch = await resolveBranch(session);
    if (!branch) return NextResponse.json({ error: "No branch found" }, { status: 400 });

    let ticketItems: any[] = [];
    let orderNumber: string | undefined;
    let resolvedOrderId: any = undefined;

    if (orderId) {
      // Kitchen ticket for a completed sale — items come from the saved order, never the client
      if (!mongoose.isValidObjectId(orderId)) return NextResponse.json({ error: "Invalid order" }, { status: 400 });
      const order = await Order.findOne({ _id: orderId, organizationId: session.organizationId });
      if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
      if (await KotTicket.exists({ organizationId: session.organizationId, orderId: order._id })) {
        return NextResponse.json({ error: "A kitchen ticket already exists for this order" }, { status: 400 });
      }
      resolvedOrderId = order._id;
      orderNumber = order.orderNumber;
      ticketItems = order.items.map((i) => ({ productId: i.productId, productName: i.productName, quantity: i.quantity }));
    } else {
      if (!Array.isArray(items) || items.length === 0) {
        return NextResponse.json({ error: "KOT must contain at least one item" }, { status: 400 });
      }
      ticketItems = items.map((i: any) => ({
        productId: i.productId,
        productName: String(i.productName || "").slice(0, 200),
        quantity: Number(i.quantity),
        notes: i.notes ? String(i.notes).slice(0, 200) : undefined,
        station: i.station,
      }));
      orderNumber = `KOT-${Date.now().toString(36).toUpperCase()}`;
    }

    const ticket = await KotTicket.create({
      organizationId: session.organizationId,
      branchId: branch._id,
      orderId: resolvedOrderId,
      orderNumber,
      tableNumber: tableNumber ? String(tableNumber) : undefined,
      orderType,
      items: ticketItems,
      priority,
      status: "queued",
    });

    return NextResponse.json(
      { success: true, message: "KOT ticket sent to Kitchen Display System!", ticket },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: process.env.NODE_ENV === "production" ? "Failed to create KOT ticket" : error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    await dbConnect();
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { ticketId, status } = await req.json();
    if (!mongoose.isValidObjectId(ticketId) || !KOT_STATUSES.includes(status)) {
      return NextResponse.json({ error: `ticketId and a status of ${KOT_STATUSES.join("/")} are required` }, { status: 400 });
    }

    const ticket = await KotTicket.findOneAndUpdate(
      { _id: ticketId, organizationId: session.organizationId },
      { $set: { status } },
      { new: true }
    );
    if (!ticket) return NextResponse.json({ error: "KOT Ticket not found" }, { status: 404 });

    return NextResponse.json({ success: true, message: `KOT Status updated to '${status}'`, ticket });
  } catch (error: any) {
    return NextResponse.json(
      { error: process.env.NODE_ENV === "production" ? "Failed to update KOT status" : error.message },
      { status: 500 }
    );
  }
}
