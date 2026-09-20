import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db/mongoose";
import { KotTicket } from "@/models/KotTicket";
import { Organization } from "@/models/Organization";
import { Branch } from "@/models/Branch";

export async function GET(req: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const query: any = {};
    if (status) {
      query.status = status;
    } else {
      query.status = { $ne: "served" }; // Default: active kitchen tickets only
    }

    const tickets = await KotTicket.find(query).sort({ createdAt: 1 });
    return NextResponse.json({ success: true, count: tickets.length, tickets });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch KOT tickets" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();
    const { orderId, orderNumber, tableNumber, orderType, items, priority = "normal" } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "KOT must contain at least one item" }, { status: 400 });
    }

    let org = await Organization.findOne();
    let branch = await Branch.findOne();

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
      { error: error.message || "Failed to create KOT ticket" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();
    const { ticketId, status } = body;

    if (!ticketId || !status) {
      return NextResponse.json({ error: "ticketId and status are required" }, { status: 400 });
    }

    const ticket = await KotTicket.findById(ticketId);
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
      { error: error.message || "Failed to update KOT status" },
      { status: 500 }
    );
  }
}
