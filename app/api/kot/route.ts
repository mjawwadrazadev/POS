import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db/mongoose";
import { KotTicket } from "@/models/KotTicket";
import { Organization } from "@/models/Organization";
import { Branch } from "@/models/Branch";
import { getSession } from "@/lib/auth/session";

export async function GET(req: Request) {
  try {
    await dbConnect();
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const ALLOWED_STATUSES = ["pending", "preparing", "ready", "served", "cancelled"];

    const query: any = { organizationId: session.organizationId };
    if (status && ALLOWED_STATUSES.includes(status)) {
      query.status = status;
    } else {
      query.status = { $ne: "served" }; // Default: active kitchen tickets only
    }

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

    const body = await req.json();
    const { orderId, orderNumber, tableNumber, orderType, items, priority = "normal" } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "KOT must contain at least one item" }, { status: 400 });
    }

    const org = await Organization.findById(session.organizationId);
    const branch = await Branch.findOne({ organizationId: session.organizationId, isMain: true })
      || await Branch.findOne({ organizationId: session.organizationId });

    if (!org || !branch) {
      return NextResponse.json({ error: "No organization found" }, { status: 400 });
    }

    const ticket = await KotTicket.create({
      organizationId: org._id,
      branchId: branch._id,
      orderId,
      orderNumber: orderNumber || `ORD-${Date.now().toString().slice(-6)}`,
      tableNumber,
      orderType: orderType || "dine_in",
      items,
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

    const body = await req.json();
    const { ticketId, status } = body;

    if (!ticketId || !status) {
      return NextResponse.json({ error: "ticketId and status are required" }, { status: 400 });
    }

    // Verify ticket belongs to session org
    const ticket = await KotTicket.findOne({ _id: ticketId, organizationId: session.organizationId });
    if (!ticket) {
      return NextResponse.json({ error: "KOT Ticket not found" }, { status: 404 });
    }

    ticket.status = status;
    await ticket.save();

    return NextResponse.json({
      success: true,
      message: `KOT Status updated to '${status}'`,
      ticket,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: process.env.NODE_ENV === "production" ? "Failed to update KOT status" : error.message },
      { status: 500 }
    );
  }
}
