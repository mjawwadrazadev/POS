import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/db/mongoose";
import { CounterSession, ICounterSession } from "@/models/CounterSession";
import { Order } from "@/models/Order";
import { Refund } from "@/models/Refund";
import { getSession } from "@/lib/auth/session";
import { resolveBranch } from "@/lib/tenant/resolveBranch";
import { roundMoney } from "@/lib/utils/server";

// Cash collected by sales in this shift minus cash paid back through refunds during the shift
async function computeShiftCash(shift: ICounterSession, until: Date) {
  const orders = await Order.find({
    counterSessionId: shift._id,
    status: { $in: ["completed", "partially_refunded", "refunded"] },
  }).select("paymentMethod grandTotal payments");

  let cashSalesTotal = 0;
  for (const order of orders) {
    if (order.paymentMethod === "cash") {
      cashSalesTotal += order.grandTotal;
    } else if (order.paymentMethod === "split" && order.payments) {
      cashSalesTotal += order.payments.filter((p) => p.method === "cash").reduce((s, p) => s + p.amount, 0);
    }
  }

  const cashRefunds = await Refund.find({
    organizationId: shift.organizationId,
    branchId: shift.branchId,
    refundMethod: "cash",
    status: "completed",
    updatedAt: { $gte: shift.openedAt, $lte: until },
  }).select("totalRefundAmount");
  const cashRefundTotal = cashRefunds.reduce((s, r) => s + r.totalRefundAmount, 0);

  return {
    cashSalesTotal: roundMoney(cashSalesTotal),
    cashRefundTotal: roundMoney(cashRefundTotal),
    expectedCashInDrawer: roundMoney(shift.openingFloat + cashSalesTotal - cashRefundTotal),
    orderCount: orders.length,
  };
}

export async function GET() {
  try {
    await dbConnect();
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const branch = await resolveBranch(session);
    if (!branch) return NextResponse.json({ success: true, activeSession: null });

    const activeSession = await CounterSession.findOne({
      organizationId: session.organizationId,
      branchId: branch._id,
      status: "open",
    }).sort({ openedAt: -1 });

    if (!activeSession) return NextResponse.json({ success: true, activeSession: null });

    const totals = await computeShiftCash(activeSession, new Date());
    return NextResponse.json({ success: true, activeSession: { ...activeSession.toObject(), ...totals } });
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

    const { action, openingFloat, notes } = await req.json();
    if (action !== "open") return NextResponse.json({ error: "Invalid action specified" }, { status: 400 });

    const float = Number(openingFloat);
    if (!Number.isFinite(float) || float < 0) {
      return NextResponse.json({ error: "Opening float must be zero or a positive amount" }, { status: 400 });
    }

    const branch = await resolveBranch(session);
    if (!branch) return NextResponse.json({ error: "No branch found." }, { status: 400 });

    const existingOpen = await CounterSession.exists({ branchId: branch._id, status: "open" });
    if (existingOpen) {
      return NextResponse.json(
        { error: "A counter session is already open. Close it before opening a new shift." },
        { status: 400 }
      );
    }

    const counterSession = await CounterSession.create({
      organizationId: session.organizationId,
      branchId: branch._id,
      cashierId: session.userId,
      cashierName: session.fullName || session.email,
      openingFloat: roundMoney(float),
      openedAt: new Date(),
      status: "open",
      notes,
    });

    return NextResponse.json({ success: true, message: "Shift opened successfully!", session: counterSession }, { status: 201 });
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

    const { sessionId, actualCountedCash, notes } = await req.json();
    if (!mongoose.isValidObjectId(sessionId)) {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
    }

    const actualCash = Number(actualCountedCash);
    if (!Number.isFinite(actualCash) || actualCash < 0) {
      return NextResponse.json({ error: "Counted cash must be zero or a positive amount" }, { status: 400 });
    }

    const counterSession = await CounterSession.findOne({ _id: sessionId, organizationId: session.organizationId });
    if (!counterSession || counterSession.status !== "open") {
      return NextResponse.json({ error: "Open counter session not found" }, { status: 404 });
    }

    // A shift is closed by the cashier who opened it, or by a manager/admin
    const isOwner = counterSession.cashierId?.toString() === session.userId;
    if (!isOwner && session.role !== "admin" && session.role !== "manager") {
      return NextResponse.json({ error: "Only the shift owner or a Manager/Admin can close this shift" }, { status: 403 });
    }

    const closedAt = new Date();
    const totals = await computeShiftCash(counterSession, closedAt);
    const variance = roundMoney(actualCash - totals.expectedCashInDrawer);

    // Atomic close so two terminals cannot close the same shift twice
    const closed = await CounterSession.findOneAndUpdate(
      { _id: counterSession._id, status: "open" },
      {
        $set: {
          closedAt,
          expectedCashInDrawer: totals.expectedCashInDrawer,
          actualCountedCash: actualCash,
          variance,
          notes: notes || counterSession.notes,
          status: "closed",
        },
      },
      { new: true }
    );
    if (!closed) return NextResponse.json({ error: "Shift was already closed" }, { status: 409 });

    return NextResponse.json({
      success: true,
      message: "Shift closed & EOD report calculated successfully!",
      summary: {
        sessionId: closed._id,
        cashierName: closed.cashierName,
        openedAt: closed.openedAt,
        closedAt: closed.closedAt,
        openingFloat: closed.openingFloat,
        cashSalesTotal: totals.cashSalesTotal,
        cashRefundTotal: totals.cashRefundTotal,
        expectedCashInDrawer: totals.expectedCashInDrawer,
        actualCountedCash: actualCash,
        variance,
        status: closed.status,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: process.env.NODE_ENV === "production" ? "Failed to close counter session" : error.message },
      { status: 500 }
    );
  }
}
