import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db/mongoose";
import { Refund } from "@/models/Refund";
import { Order } from "@/models/Order";
import { Product } from "@/models/Product";
import { JournalEntry } from "@/models/JournalEntry";
import { getSession } from "@/lib/auth/session";
import { logAudit } from "@/lib/audit/logger";

// GET: Fetch refunds list for organization
export async function GET(req: Request) {
  try {
    await dbConnect();
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const query: any = {};
    if (session.role !== "super_admin") {
      query.organizationId = session.organizationId;
    }
    if (status) {
      query.status = status;
    }

    const refunds = await Refund.find(query).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ success: true, refunds });
  } catch (error: any) {
    return NextResponse.json(
      { error: process.env.NODE_ENV === "production" ? "Failed to fetch refunds" : error.message },
      { status: 500 }
    );
  }
}

// POST: Request a new order refund
export async function POST(req: Request) {
  try {
    await dbConnect();
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      originalOrderId,
      items,
      refundMethod = "cash",
      notes,
    } = body;

    if (!originalOrderId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Original order ID and refund items are required" },
        { status: 400 }
      );
    }

    const order = await Order.findById(originalOrderId);
    if (!order) {
      return NextResponse.json({ error: "Original order not found" }, { status: 404 });
    }

    const totalRefundAmount = items.reduce((sum: number, i: any) => sum + (i.refundAmount || i.unitPrice * i.quantity), 0);

    // Determine initial status: If requested by manager/admin, auto-approve; if cashier, pending_approval
    const isAutoApprove = session.role === "admin" || session.role === "manager" || session.role === "super_admin";
    const initialStatus = isAutoApprove ? "approved" : "pending_approval";

    const refund = await Refund.create({
      organizationId: order.organizationId,
      branchId: order.branchId,
      originalOrderId: order._id,
      orderNumber: order.orderNumber,
      items,
      totalRefundAmount,
      refundMethod,
      requestedBy: session.userId,
      requestedByName: session.fullName,
      approvedBy: isAutoApprove ? session.userId : undefined,
      approvedByName: isAutoApprove ? session.fullName : undefined,
      status: initialStatus,
      notes,
    });

    // Audit log
    await logAudit({
      organizationId: order.organizationId,
      branchId: order.branchId,
      actorId: session.userId,
      actorName: session.fullName || session.name || session.email,
      actorRole: session.role,
      action: isAutoApprove ? "refund.auto_approve" : "refund.request",
      targetCollection: "Refund",
      targetId: refund._id,
      after: { orderNumber: order.orderNumber, totalRefundAmount, status: initialStatus },
    });

    // If auto-approved immediately, process restock & reversing ledger entry
    if (isAutoApprove) {
      await processApprovedRefund(refund, order, session);
    }

    return NextResponse.json({
      success: true,
      message: isAutoApprove
        ? `Refund of PKR ${totalRefundAmount.toLocaleString()} approved and processed!`
        : `Refund request for Order #${order.orderNumber} submitted for Manager Approval.`,
      refund,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: process.env.NODE_ENV === "production" ? "Failed to process refund request" : error.message },
      { status: 500 }
    );
  }
}

// PATCH: Approve or Reject a Pending Refund Request
export async function PATCH(req: Request) {
  try {
    await dbConnect();
    const session = await getSession();
    if (!session || (session.role !== "admin" && session.role !== "manager" && session.role !== "super_admin")) {
      return NextResponse.json(
        { error: "Forbidden — Only Managers and Admins can approve or reject refunds" },
        { status: 403 }
      );
    }

    const { refundId, action } = await req.json();
    if (!refundId || !action || (action !== "approve" && action !== "reject")) {
      return NextResponse.json(
        { error: "Refund ID and action (approve/reject) are required" },
        { status: 400 }
      );
    }

    const refund = await Refund.findById(refundId);
    if (!refund) {
      return NextResponse.json({ error: "Refund record not found" }, { status: 404 });
    }

    // Four-Eyes Principle: Prevent a manager from approving their own refund request
    if (action === "approve" && refund.requestedBy?.toString() === session.userId && session.role !== "super_admin") {
      return NextResponse.json(
        { error: "Forbidden — You cannot approve your own refund request. A different Manager or Admin must approve it." },
        { status: 403 }
      );
    }

    if (refund.status !== "pending_approval") {
      return NextResponse.json(
        { error: `Refund is already in '${refund.status}' status` },
        { status: 400 }
      );
    }

    if (action === "reject") {
      refund.status = "rejected";
      refund.approvedBy = session.userId as any;
      refund.approvedByName = session.fullName;
      await refund.save();

      await logAudit({
        organizationId: refund.organizationId,
        branchId: refund.branchId,
        actorId: session.userId,
        actorName: session.fullName || session.name || session.email,
        actorRole: session.role,
        action: "refund.reject",
        targetCollection: "Refund",
        targetId: refund._id,
      });

      return NextResponse.json({ success: true, message: "Refund request rejected.", refund });
    }

    // Action === "approve"
    const order = await Order.findById(refund.originalOrderId);
    refund.status = "approved";
    refund.approvedBy = session.userId as any;
    refund.approvedByName = session.fullName;
    await refund.save();

    await processApprovedRefund(refund, order, session);

    return NextResponse.json({
      success: true,
      message: `Refund of PKR ${refund.totalRefundAmount.toLocaleString()} approved and completed successfully!`,
      refund,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: process.env.NODE_ENV === "production" ? "Failed to process refund approval" : error.message },
      { status: 500 }
    );
  }
}

// Helper to restock inventory & post reversing double-entry journal entry
async function processApprovedRefund(refund: any, order: any, session: any) {
  // 1. Restock items where restockFlag === true
  for (const item of refund.items) {
    if (item.restockFlag && item.productId) {
      await Product.findByIdAndUpdate(item.productId, {
        $inc: { stock: item.quantity },
      });
    }
  }

  // 2. Post Reversing Double-Entry Journal Entry
  const subtotalReversal = Math.round(refund.totalRefundAmount / 1.16);
  const taxReversal = refund.totalRefundAmount - subtotalReversal;

  const reversingLines = [
    {
      accountCode: "4010-SALES",
      accountName: "Sales Revenue (Refund Reversal)",
      type: "debit" as const,
      amount: subtotalReversal,
    },
    {
      accountCode: "2020-TAX-PAYABLE",
      accountName: "FBR Sales Tax Payable (Refund Tax Adjustment)",
      type: "debit" as const,
      amount: taxReversal,
    },
    {
      accountCode: refund.refundMethod === "cash" ? "1010-CASH" : "1020-BANK",
      accountName: refund.refundMethod === "cash" ? "Cash-in-Drawer (Refund Outflow)" : "Bank Account (Refund Outflow)",
      type: "credit" as const,
      amount: refund.totalRefundAmount,
    },
  ];

  const reversingEntry = await JournalEntry.create({
    organizationId: refund.organizationId,
    branchId: refund.branchId,
    entryNumber: `JE-REF-${Date.now().toString().slice(-6)}`,
    referenceId: refund.orderNumber,
    description: `Reversing journal entry for order refund #${refund.orderNumber}`,
    lines: reversingLines,
    totalDebit: refund.totalRefundAmount,
    totalCredit: refund.totalRefundAmount,
    isBalanced: true,
  });

  refund.reversingJournalEntryId = reversingEntry._id;
  refund.status = "completed";
  await refund.save();

  // 3. Mark original order status
  if (order) {
    order.status = "cancelled";
    await order.save();
  }

  // 4. Audit Log
  await logAudit({
    organizationId: refund.organizationId,
    branchId: refund.branchId,
    actorId: session.userId,
    actorName: session.fullName,
    actorRole: session.role,
    action: "refund.complete",
    targetCollection: "Refund",
    targetId: refund._id,
    after: { totalRefundAmount: refund.totalRefundAmount, journalEntryId: reversingEntry._id },
  });
}
