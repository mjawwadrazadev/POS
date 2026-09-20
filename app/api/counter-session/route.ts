import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db/mongoose";
import { CounterSession } from "@/models/CounterSession";
import { Order } from "@/models/Order";
import { Organization } from "@/models/Organization";
import { Branch } from "@/models/Branch";

export async function GET(req: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const cashierName = searchParams.get("cashierName") || "Main Cashier";

    const activeSession = await CounterSession.findOne({
      status: "open",
    }).sort({ openedAt: -1 });

    if (!activeSession) {
      return NextResponse.json({ success: true, activeSession: null });
    }

    // Calculate current cash sales within this session
    const cashOrders = await Order.find({
      counterSessionId: activeSession._id,
      status: "completed",
    });

    let cashSalesTotal = 0;
    for (const order of cashOrders) {
      if (order.paymentMethod === "cash") {
        cashSalesTotal += order.grandTotal;
      } else if (order.paymentMethod === "split" && order.payments) {
        const cashPart = order.payments.find((p) => p.method === "cash");
        if (cashPart) cashSalesTotal += cashPart.amount;
      }
    }

    const expectedCashInDrawer = activeSession.openingFloat + cashSalesTotal;

    return NextResponse.json({
      success: true,
      activeSession: {
        ...activeSession.toObject(),
        cashSalesTotal,
        expectedCashInDrawer,
        orderCount: cashOrders.length,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch counter session" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();
    const { action, openingFloat, cashierName = "Main Cashier", notes } = body;

    let org = await Organization.findOne();
    let branch = await Branch.findOne();

    if (!org || !branch) {
      return NextResponse.json(
        { error: "No organization or branch found. Run /api/seed first." },
        { status: 400 }
      );
    }

    if (action === "open") {
      // Check if session is already open
      const existingOpen = await CounterSession.findOne({
        branchId: branch._id,
        status: "open",
      });

      if (existingOpen) {
        return NextResponse.json(
          { error: "A counter session is already open. Close it before opening a new shift." },
          { status: 400 }
        );
      }

      const session = await CounterSession.create({
        organizationId: org._id,
        branchId: branch._id,
        cashierName,
        openingFloat: Number(openingFloat) || 0,
        openedAt: new Date(),
        status: "open",
        notes,
      });

      return NextResponse.json(
        { success: true, message: "Shift opened successfully!", session },
        { status: 201 }
      );
    }

    return NextResponse.json({ error: "Invalid action specified" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to process counter session action" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();
    const { sessionId, actualCountedCash, notes } = body;

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
    }

    const session = await CounterSession.findById(sessionId);
    if (!session || session.status !== "open") {
      return NextResponse.json(
        { error: "Open counter session not found" },
        { status: 404 }
      );
    }

    // Calculate total cash collected during session
    const cashOrders = await Order.find({
      counterSessionId: session._id,
      status: "completed",
    });

    let cashSalesTotal = 0;
    for (const order of cashOrders) {
      if (order.paymentMethod === "cash") {
        cashSalesTotal += order.grandTotal;
      } else if (order.paymentMethod === "split" && order.payments) {
        const cashPart = order.payments.find((p) => p.method === "cash");
        if (cashPart) cashSalesTotal += cashPart.amount;
      }
    }

    const expectedCashInDrawer = session.openingFloat + cashSalesTotal;
    const actualCash = Number(actualCountedCash) || 0;
    const variance = actualCash - expectedCashInDrawer;

    session.closedAt = new Date();
    session.expectedCashInDrawer = expectedCashInDrawer;
    session.actualCountedCash = actualCash;
    session.variance = variance;
    session.notes = notes || session.notes;
    session.status = "closed";
    await session.save();

    return NextResponse.json({
      success: true,
      message: "Shift closed & EOD report calculated successfully!",
      summary: {
        sessionId: session._id,
        cashierName: session.cashierName,
        openedAt: session.openedAt,
        closedAt: session.closedAt,
        openingFloat: session.openingFloat,
        cashSalesTotal,
        expectedCashInDrawer,
        actualCountedCash: actualCash,
        variance,
        status: session.status,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to close counter session" },
      { status: 500 }
    );
  }
}
