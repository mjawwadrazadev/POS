import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/db/mongoose";
import { StockTransfer, IStockTransferBatchMove } from "@/models/StockTransfer";
import { Product } from "@/models/Product";
import { Branch } from "@/models/Branch";
import { Batch } from "@/models/Batch";
import { getSession } from "@/lib/auth/session";
import { logAudit } from "@/lib/audit/logger";
import { generateDocNumber } from "@/lib/utils/server";

/*
 * Stock model: `Product.stock` is the organization-wide total. Per-branch quantities live in
 * `Batch` records (FEFO). A transfer therefore never changes Product.stock — it moves batch
 * quantities from the source branch (on dispatch) to the destination branch (on receipt).
 * For products that are not batch-tracked the transfer is a documented movement only.
 */

const MANAGER_ROLES = ["admin", "manager"];

class TransferError extends Error {}

export async function GET() {
  try {
    await dbConnect();
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const transfers = await StockTransfer.find({ organizationId: session.organizationId })
      .populate("fromBranchId", "name code")
      .populate("toBranchId", "name code")
      .sort({ createdAt: -1 });

    return NextResponse.json({ success: true, count: transfers.length, transfers });
  } catch (error: any) {
    return NextResponse.json(
      { error: process.env.NODE_ENV === "production" ? "Failed to fetch stock transfers" : error.message },
      { status: 500 }
    );
  }
}

async function restoreBatchMoves(moves: IStockTransferBatchMove[]) {
  for (const m of moves) {
    await Batch.updateOne({ _id: m.batchId }, { $inc: { quantityRemaining: m.quantity }, $set: { status: "active" } });
  }
}

export async function POST(req: Request) {
  const takenSoFar: IStockTransferBatchMove[] = [];

  try {
    await dbConnect();
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!MANAGER_ROLES.includes(session.role)) {
      return NextResponse.json({ error: "Forbidden — Manager or Admin required" }, { status: 403 });
    }

    const { fromBranchId, toBranchId, items, notes } = await req.json();

    if (!mongoose.isValidObjectId(fromBranchId) || !mongoose.isValidObjectId(toBranchId)) {
      return NextResponse.json({ error: "Source branch and destination branch are required" }, { status: 400 });
    }
    if (String(fromBranchId) === String(toBranchId)) {
      return NextResponse.json({ error: "Source and destination branches cannot be the same" }, { status: 400 });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Transfer must contain at least one product item" }, { status: 400 });
    }

    const branchCount = await Branch.countDocuments({
      _id: { $in: [fromBranchId, toBranchId] },
      organizationId: session.organizationId,
    });
    if (branchCount !== 2) {
      return NextResponse.json({ error: "Both branches must belong to your organization" }, { status: 400 });
    }

    // Validate everything before moving anything
    const planned = [];
    for (const item of items) {
      const quantity = Number(item?.quantity);
      if (!mongoose.isValidObjectId(item?.productId) || !Number.isInteger(quantity) || quantity < 1) {
        return NextResponse.json({ error: "Each item needs a product and a whole-number quantity" }, { status: 400 });
      }
      const product = await Product.findOne({ _id: item.productId, organizationId: session.organizationId });
      if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });
      if (product.stock < quantity) {
        return NextResponse.json(
          { error: `Insufficient stock for '${product.name}' (Available: ${product.stock}, Requested: ${quantity})` },
          { status: 400 }
        );
      }
      planned.push({ product, quantity });
    }

    const now = new Date();
    const processedItems = [];

    for (const { product, quantity } of planned) {
      const isBatchTracked = await Batch.exists({ organizationId: session.organizationId, productId: product._id });
      const batchMoves: IStockTransferBatchMove[] = [];

      if (isBatchTracked) {
        const sourceBatches = await Batch.find({
          organizationId: session.organizationId,
          productId: product._id,
          branchId: fromBranchId,
          status: "active",
          quantityRemaining: { $gt: 0 },
          expiryDate: { $gte: now },
        }).sort({ expiryDate: 1 });

        const available = sourceBatches.reduce((s, b) => s + b.quantityRemaining, 0);
        if (available < quantity) {
          throw new TransferError(
            `Only ${available} unit(s) of '${product.name}' are in non-expired batches at the source branch`
          );
        }

        let remaining = quantity;
        for (const batch of sourceBatches) {
          if (remaining <= 0) break;
          const take = Math.min(batch.quantityRemaining, remaining);
          const updated = await Batch.findOneAndUpdate(
            { _id: batch._id, quantityRemaining: { $gte: take } },
            { $inc: { quantityRemaining: -take } },
            { new: true }
          );
          if (!updated) throw new TransferError(`Stock for '${product.name}' changed during transfer. Please retry.`);
          if (updated.quantityRemaining === 0) await Batch.updateOne({ _id: updated._id }, { $set: { status: "depleted" } });

          const move = {
            batchId: updated._id as mongoose.Types.ObjectId,
            batchNumber: updated.batchNumber,
            expiryDate: updated.expiryDate,
            costPrice: updated.costPrice,
            quantity: take,
          };
          batchMoves.push(move);
          takenSoFar.push(move);
          remaining -= take;
        }
      }

      processedItems.push({
        productId: product._id,
        productName: product.name,
        sku: product.sku,
        quantity,
        batchMoves,
      });
    }

    const transfer = await StockTransfer.create({
      organizationId: session.organizationId,
      transferNumber: generateDocNumber("TRF"),
      fromBranchId,
      toBranchId,
      items: processedItems,
      status: "in_transit",
      requestedBy: session.fullName || session.email,
      requestedById: session.userId,
      notes,
    });
    takenSoFar.length = 0;

    await logAudit({
      organizationId: session.organizationId,
      actorId: session.userId,
      actorName: session.fullName || session.email,
      actorRole: session.role,
      action: "stock_transfer.dispatch",
      targetCollection: "StockTransfer",
      targetId: transfer._id as any,
      after: { transferNumber: transfer.transferNumber, items: processedItems.length },
    });

    return NextResponse.json({ success: true, message: "Stock transfer created and in transit!", transfer }, { status: 201 });
  } catch (error: any) {
    if (takenSoFar.length > 0) {
      await restoreBatchMoves(takenSoFar).catch((e) => console.error("[Transfers] Rollback failed:", e));
    }
    const isClientError = error instanceof TransferError;
    return NextResponse.json(
      { error: isClientError || process.env.NODE_ENV !== "production" ? error.message : "Failed to create stock transfer" },
      { status: isClientError ? 400 : 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    await dbConnect();
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!MANAGER_ROLES.includes(session.role)) {
      return NextResponse.json({ error: "Forbidden — insufficient role" }, { status: 403 });
    }

    const { transferId, action } = await req.json();
    if (!mongoose.isValidObjectId(transferId) || (action !== "receive" && action !== "cancel")) {
      return NextResponse.json({ error: "transferId and action (receive/cancel) are required" }, { status: 400 });
    }

    const actor = session.fullName || session.email;

    // Atomic state transition: only an in-transit transfer can be received or cancelled, exactly once
    const transfer = await StockTransfer.findOneAndUpdate(
      { _id: transferId, organizationId: session.organizationId, status: "in_transit" },
      action === "receive"
        ? { $set: { status: "received", approvedBy: actor, receivedAt: new Date() } }
        : { $set: { status: "cancelled", approvedBy: actor } },
      { new: true }
    );

    if (!transfer) {
      const existing = await StockTransfer.findOne({ _id: transferId, organizationId: session.organizationId }).select("status");
      if (!existing) return NextResponse.json({ error: "Stock transfer record not found" }, { status: 404 });
      return NextResponse.json({ error: `Transfer is already '${existing.status}'` }, { status: 400 });
    }

    if (action === "receive") {
      for (const item of transfer.items) {
        for (const move of item.batchMoves || []) {
          await Batch.findOneAndUpdate(
            {
              organizationId: transfer.organizationId,
              branchId: transfer.toBranchId,
              productId: item.productId,
              batchNumber: move.batchNumber,
            },
            {
              $inc: { quantityRemaining: move.quantity, quantityReceived: move.quantity },
              $set: { status: "active" },
              $setOnInsert: { expiryDate: move.expiryDate, costPrice: move.costPrice },
            },
            { upsert: true }
          );
        }
      }
    } else {
      for (const item of transfer.items) {
        await restoreBatchMoves(item.batchMoves || []);
      }
    }

    await logAudit({
      organizationId: session.organizationId,
      actorId: session.userId,
      actorName: actor,
      actorRole: session.role,
      action: action === "receive" ? "stock_transfer.receive" : "stock_transfer.cancel",
      targetCollection: "StockTransfer",
      targetId: transfer._id as any,
    });

    return NextResponse.json({
      success: true,
      message:
        action === "receive"
          ? "Stock transfer received — batches are now available at the destination branch."
          : "Stock transfer cancelled and batches returned to the source branch.",
      transfer,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: process.env.NODE_ENV === "production" ? "Failed to update stock transfer" : error.message },
      { status: 500 }
    );
  }
}

