import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/db/mongoose";
import { Refund, IRefund } from "@/models/Refund";
import { Order } from "@/models/Order";
import { getSession, SessionPayload } from "@/lib/auth/session";
import { logAudit } from "@/lib/audit/logger";
import { restockItem } from "@/lib/inventory/fefo";
import { postJournalEntry, isAccountingEnabled, accountForMethod, ACCOUNTS } from "@/lib/accounting/ledger";
import { roundMoney } from "@/lib/utils/server";

const REFUND_METHODS = ["cash", "card_reversal", "store_credit", "wallet"];
const REFUND_STATUSES = ["pending_approval", "approved", "rejected", "completed"];
const APPROVER_ROLES = ["admin", "manager"];

// GET: Fetch refunds list for the session organization
export async function GET(req: Request) {
  try {
    await dbConnect();
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const query: any = { organizationId: session.organizationId };
    if (status && REFUND_STATUSES.includes(status)) query.status = status;

    const refunds = await Refund.find(query).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ success: true, refunds });
  } catch (error: any) {
    return NextResponse.json(
      { error: process.env.NODE_ENV === "production" ? "Failed to fetch refunds" : error.message },
      { status: 500 }
    );
  }
}

// POST: Request a new refund. Amounts are always computed server-side from the original order.
export async function POST(req: Request) {
  try {
    await dbConnect();
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { originalOrderId, items, refundMethod = "cash", notes } = await req.json();

    if (!mongoose.isValidObjectId(originalOrderId) || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Original order ID and refund items are required" }, { status: 400 });
    }
    if (!REFUND_METHODS.includes(refundMethod)) {
      return NextResponse.json({ error: "Invalid refund method" }, { status: 400 });
    }

    const order = await Order.findOne({ _id: originalOrderId, organizationId: session.organizationId });
    if (!order) return NextResponse.json({ error: "Original order not found" }, { status: 404 });
    if (order.status !== "completed" && order.status !== "partially_refunded") {
      return NextResponse.json({ error: `Order is '${order.status}' and cannot be refunded` }, { status: 400 });
    }

    // Quantities already refunded or waiting in other open refund requests
    const openRefunds = await Refund.find({
      originalOrderId: order._id,
      status: { $in: ["pending_approval", "approved"] },
    }).lean();
    const reserved = new Map<string, number>();
    for (const r of openRefunds) {
      for (const i of r.items) {
        const key = i.productId.toString();
        reserved.set(key, (reserved.get(key) || 0) + i.quantity);
      }
    }

    // Refund = share of the order's net line value, scaled by grandTotal/subtotal so the
    // global discount and sales tax are refunded proportionally.
    const scale = order.subtotal > 0 ? order.grandTotal / order.subtotal : 0;
    const taxScale = order.subtotal > 0 ? order.taxAmount / order.subtotal : 0;

    const refundItems = [];
    let totalRefundAmount = 0;
    let taxAmount = 0;

    for (const reqItem of items) {
      const productId = String(reqItem?.productId ?? "");
      const quantity = Number(reqItem?.quantity);
      const orderItem = order.items.find((i) => i.productId.toString() === productId);

      if (!orderItem) {
        return NextResponse.json({ error: "Refund item is not part of the original order" }, { status: 400 });
      }
      if (!Number.isInteger(quantity) || quantity < 1) {
        return NextResponse.json({ error: `Invalid refund quantity for '${orderItem.productName}'` }, { status: 400 });
      }

      const available = orderItem.quantity - (orderItem.refundedQuantity || 0) - (reserved.get(productId) || 0);
      if (quantity > available) {
        return NextResponse.json(
          { error: `Only ${Math.max(0, available)} unit(s) of '${orderItem.productName}' can still be refunded` },
          { status: 400 }
        );
      }
      reserved.set(productId, (reserved.get(productId) || 0) + quantity);

      const lineNet = (orderItem.total / orderItem.quantity) * quantity;
      const refundAmount = roundMoney(lineNet * scale);
      totalRefundAmount += refundAmount;
      taxAmount += lineNet * taxScale;

      refundItems.push({
        productId: orderItem.productId,
        productName: orderItem.productName,
        sku: orderItem.sku,
        quantity,
        unitPrice: orderItem.unitPrice,
        refundAmount,
        restockFlag: reqItem?.restockFlag !== false,
        reason: String(reqItem?.reason || "Customer return").slice(0, 200),
      });
    }

    totalRefundAmount = roundMoney(totalRefundAmount);
    taxAmount = Math.min(roundMoney(taxAmount), totalRefundAmount);

    const isAutoApprove = APPROVER_ROLES.includes(session.role);

    const refund = await Refund.create({
      organizationId: order.organizationId,
      branchId: order.branchId,
      originalOrderId: order._id,
      orderNumber: order.orderNumber,
      items: refundItems,
      totalRefundAmount,
      taxAmount,
      refundMethod,
      requestedBy: session.userId,
      requestedByName: session.fullName || session.name || session.email,
      approvedBy: isAutoApprove ? session.userId : undefined,
      approvedByName: isAutoApprove ? session.fullName : undefined,
      status: isAutoApprove ? "approved" : "pending_approval",
      notes,
    });

    await logAudit({
      organizationId: order.organizationId,
      branchId: order.branchId,
      actorId: session.userId,
      actorName: session.fullName || session.name || session.email,
      actorRole: session.role,
      action: isAutoApprove ? "refund.auto_approve" : "refund.request",
      targetCollection: "Refund",
      targetId: refund._id as any,
      after: { orderNumber: order.orderNumber, totalRefundAmount, status: refund.status },
    });

    if (isAutoApprove) {
      await processApprovedRefund(refund, session);
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

// PATCH: Approve or Reject a pending refund request (same organization only)
export async function PATCH(req: Request) {
  try {
    await dbConnect();
    const session = await getSession();
    if (!session || !APPROVER_ROLES.includes(session.role)) {
      return NextResponse.json({ error: "Forbidden — Only Managers and Admins can approve or reject refunds" }, { status: 403 });
    }

    const { refundId, action } = await req.json();
    if (!mongoose.isValidObjectId(refundId) || (action !== "approve" && action !== "reject")) {
      return NextResponse.json({ error: "Refund ID and action (approve/reject) are required" }, { status: 400 });
    }

    const existing = await Refund.findOne({ _id: refundId, organizationId: session.organizationId });
    if (!existing) return NextResponse.json({ error: "Refund record not found" }, { status: 404 });

    // Four-Eyes Principle: nobody approves their own refund request
    if (action === "approve" && existing.requestedBy?.toString() === session.userId) {
      return NextResponse.json(
        { error: "Forbidden — You cannot approve your own refund request. A different Manager or Admin must approve it." },
        { status: 403 }
      );
    }

    // Atomic state transition — a refund can only leave 'pending_approval' once
    const refund = await Refund.findOneAndUpdate(
      { _id: refundId, organizationId: session.organizationId, status: "pending_approval" },
      {
        $set: {
          status: action === "approve" ? "approved" : "rejected",
          approvedBy: session.userId,
          approvedByName: session.fullName || session.email,
        },
      },
      { new: true }
    );
    if (!refund) {
      return NextResponse.json({ error: `Refund is already in '${existing.status}' status` }, { status: 400 });
    }

    if (action === "reject") {
      await logAudit({
        organizationId: refund.organizationId,
        branchId: refund.branchId,
        actorId: session.userId,
        actorName: session.fullName || session.name || session.email,
        actorRole: session.role,
        action: "refund.reject",
        targetCollection: "Refund",
        targetId: refund._id as any,
      });
      return NextResponse.json({ success: true, message: "Refund request rejected.", refund });
    }

    await processApprovedRefund(refund, session);

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

// Restock, mark refunded quantities on the order, and post a balanced reversing journal entry
async function processApprovedRefund(refund: IRefund, session: SessionPayload) {
  const order = await Order.findOne({ _id: refund.originalOrderId, organizationId: refund.organizationId });

  for (const item of refund.items) {
    const orderItem = order?.items.find((i) => i.productId.toString() === item.productId.toString());

    if (item.restockFlag) {
      await restockItem(refund.organizationId, refund.branchId, item.productId, item.quantity, orderItem?.batchNumber);
    }

    await Order.updateOne(
      { _id: refund.originalOrderId },
      { $inc: { "items.$[it].refundedQuantity": item.quantity } },
      { arrayFilters: [{ "it.productId": item.productId }] }
    );
  }

  if (await isAccountingEnabled(refund.organizationId)) {
    try {
      const entry = await postJournalEntry({
        organizationId: refund.organizationId,
        branchId: refund.branchId,
        prefix: "JE-REF",
        referenceId: refund.orderNumber,
        description: `Reversing journal entry for refund on order #${refund.orderNumber}`,
        lines: [
          { ...ACCOUNTS.SALES, accountName: "Sales Revenue (Refund Reversal)", type: "debit", amount: refund.totalRefundAmount - (refund.taxAmount || 0) },
          { ...ACCOUNTS.TAX_PAYABLE, accountName: "Sales Tax Payable (Refund Adjustment)", type: "debit", amount: refund.taxAmount || 0 },
          { ...accountForMethod(refund.refundMethod), type: "credit", amount: refund.totalRefundAmount },
        ],
      });
      refund.reversingJournalEntryId = entry._id as any;
    } catch (ledgerErr) {
      console.error(`[Ledger] Failed to post refund reversal for ${refund.orderNumber}:`, ledgerErr);
    }
  }

  refund.status = "completed";
  await refund.save();

  // Full or partial refund status on the original order
  const updatedOrder = await Order.findById(refund.originalOrderId);
  if (updatedOrder) {
    const fullyRefunded = updatedOrder.items.every((i) => (i.refundedQuantity || 0) >= i.quantity);
    updatedOrder.status = fullyRefunded ? "refunded" : "partially_refunded";
    await updatedOrder.save();
  }

  await logAudit({
    organizationId: refund.organizationId,
    branchId: refund.branchId,
    actorId: session.userId,
    actorName: session.fullName || session.email,
    actorRole: session.role,
    action: "refund.complete",
    targetCollection: "Refund",
    targetId: refund._id as any,
    after: { totalRefundAmount: refund.totalRefundAmount, journalEntryId: refund.reversingJournalEntryId },
  });
}
