import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db/mongoose";
import { CounterSession } from "@/models/CounterSession";
import { Order } from "@/models/Order";
import { Organization } from "@/models/Organization";
import { Branch } from "@/models/Branch";
import { getSession } from "@/lib/auth/session";

export async function GET(req: Request) {
  try {
    await dbConnect();
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const cashierName = searchParams.get("cashierName") || "Main Cashier";

    const activeSession = await CounterSession.findOne({
      organizationId: session.organizationId,
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
      { error: process.env.NODE_ENV === "production" ? "Failed to fetch counter session" : error.message },
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
    const { action, openingFloat, cashierName = "Main Cashier", notes } = body;

    const org = await Organization.findById(session.organizationId);
    const branch = await Branch.findOne({ organizationId: session.organizationId, isMain: true })
      || await Branch.findOne({ organizationId: session.organizationId });

    if (!org || !branch) {
      return NextResponse.json(
        { error: "No organization or branch found." },
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

      const counterSession = await CounterSession.create({
        organizationId: org._id,
        branchId: branch._id,
        cashierName: session.fullName || cashierName,
        openingFloat: Number(openingFloat) || 0,
        openedAt: new Date(),
        status: "open",
        notes,
      });

      return NextResponse.json(
        { success: true, message: "Shift opened successfully!", session: counterSession },
        { status: 201 }
      );
    }

    return NextResponse.json({ error: "Invalid action specified" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { error: process.env.NODE_ENV === "production" ? "Failed to process counter session action" : error.message },
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
    const { sessionId, actualCountedCash, notes } = body;

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
    }

    const counterSession = await CounterSession.findOne({
      _id: sessionId,
      organizationId: session.organizationId,
    });

    if (!counterSession || counterSession.status !== "open") {
      return NextResponse.json(
        { error: "Open counter session not found" },
        { status: 404 }
      );
    }

    // Calculate total cash collected during session
    const cashOrders = await Order.find({
      counterSessionId: counterSession._id,
      status: "completed",
    });

    let cashSalesTotal = 0;
    for (const order of cashOrders) {
      if (order.paymentMethod === "cash") {
        cashSalesTotal += order.grandTotal;
      } else if (order.paymentMethod === "split" && order.payments) {
        const cashPart = order.payments.find((p: any) => p.method === "cash");
        if (cashPart) cashSalesTotal += cashPart.amount;
      }
    }

    const expectedCashInDrawer = counterSession.openingFloat + cashSalesTotal;
    const actualCash = Number(actualCountedCash) || 0;
    const variance = actualCash - expectedCashInDrawer;

    counterSession.closedAt = new Date();
    counterSession.expectedCashInDrawer = expectedCashInDrawer;
    counterSession.actualCountedCash = actualCash;
    counterSession.variance = variance;
    counterSession.notes = notes || counterSession.notes;
    counterSession.status = "closed";
    await counterSession.save();

    return NextResponse.json({
      success: true,
      message: "Shift closed & EOD report calculated successfully!",
      summary: {
        sessionId: counterSession._id,
        cashierName: counterSession.cashierName,
        openedAt: counterSession.openedAt,
        closedAt: counterSession.closedAt,
        openingFloat: counterSession.openingFloat,
        cashSalesTotal,
        expectedCashInDrawer,
        actualCountedCash: actualCash,
        variance,
        status: counterSession.status,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: process.env.NODE_ENV === "production" ? "Failed to close counter session" : error.message },
      { status: 500 }
    );
  }
}
