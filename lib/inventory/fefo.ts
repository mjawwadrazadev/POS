import mongoose from "mongoose";
import { Batch } from "@/models/Batch";
import { Product } from "@/models/Product";

type Id = string | mongoose.Types.ObjectId;

export interface FEFODeductionResult {
  productId: string;
  quantity: number;
  deductedBatches: {
    batchId: string;
    batchNumber: string;
    quantityDeducted: number;
    expiryDate: Date;
  }[];
  primaryBatchNumber?: string;
}

/**
 * Deducts product stock using First-Expired, First-Out (FEFO).
 *
 * Every write is a conditional atomic update, so two terminals selling the last unit at the same
 * time can never drive stock negative. If any step fails, everything this call already changed is
 * restored before the error is thrown. Callers that deduct several items must call
 * `restoreStockDeductions` on the results they collected if a later item fails.
 */
export async function deductStockFEFO(
  organizationId: Id,
  productId: Id,
  branchId: Id,
  requestedQuantity: number
): Promise<FEFODeductionResult> {
  const now = new Date();

  // 1. Retire batches that have expired at this branch
  await Batch.updateMany(
    { productId, branchId, status: "active", expiryDate: { $lt: now } },
    { $set: { status: "expired" } }
  );

  // 2. Atomically reserve the overall product stock
  const product = await Product.findOneAndUpdate(
    { _id: productId, organizationId, stock: { $gte: requestedQuantity } },
    { $inc: { stock: -requestedQuantity } },
    { new: true }
  );

  if (!product) {
    const existing = await Product.findOne({ _id: productId, organizationId }).select("name stock").lean();
    if (!existing) throw new Error("Product not found in this store");
    throw new Error(`Insufficient stock for ${existing.name}. Available: ${existing.stock}`);
  }

  const result: FEFODeductionResult = {
    productId: String(productId),
    quantity: requestedQuantity,
    deductedBatches: [],
  };

  // 3. Consume batches at this branch, earliest expiry first (only if the product is batch-tracked here)
  const batches = await Batch.find({
    productId,
    branchId,
    status: "active",
    quantityRemaining: { $gt: 0 },
    expiryDate: { $gte: now },
  }).sort({ expiryDate: 1 });

  if (batches.length > 0) {
    const available = batches.reduce((sum, b) => sum + b.quantityRemaining, 0);
    if (available < requestedQuantity) {
      await restoreStockDeductions([result]);
      throw new Error(
        `Insufficient non-expired batch inventory for ${product.name}. Needed: ${requestedQuantity}, available: ${available}`
      );
    }

    let remaining = requestedQuantity;
    for (const batch of batches) {
      if (remaining <= 0) break;
      const take = Math.min(batch.quantityRemaining, remaining);

      const updated = await Batch.findOneAndUpdate(
        { _id: batch._id, status: "active", quantityRemaining: { $gte: take } },
        { $inc: { quantityRemaining: -take } },
        { new: true }
      );

      if (!updated) {
        // Another sale consumed this batch concurrently — undo and let the cashier retry
        await restoreStockDeductions([result]);
        throw new Error(`Stock for ${product.name} changed during checkout. Please retry.`);
      }

      if (updated.quantityRemaining === 0) {
        await Batch.updateOne({ _id: updated._id }, { $set: { status: "depleted" } });
      }

      remaining -= take;
      result.deductedBatches.push({
        batchId: (updated._id as mongoose.Types.ObjectId).toString(),
        batchNumber: updated.batchNumber,
        quantityDeducted: take,
        expiryDate: updated.expiryDate,
      });
    }
  }

  result.primaryBatchNumber = result.deductedBatches[0]?.batchNumber || product.batchNumber || undefined;
  return result;
}

/** Puts back stock (product total + batch quantities) taken by earlier `deductStockFEFO` calls. */
export async function restoreStockDeductions(results: FEFODeductionResult[]): Promise<void> {
  for (const r of results) {
    await Product.updateOne({ _id: r.productId }, { $inc: { stock: r.quantity } });
    for (const b of r.deductedBatches) {
      await Batch.updateOne(
        { _id: b.batchId },
        { $inc: { quantityRemaining: b.quantityDeducted }, $set: { status: "active" } }
      );
    }
  }
}

/** Returns sold units to stock (refunds). Restores the original batch when it is known. */
export async function restockItem(
  organizationId: Id,
  branchId: Id,
  productId: Id,
  quantity: number,
  batchNumber?: string
): Promise<void> {
  const updated = await Product.updateOne({ _id: productId, organizationId }, { $inc: { stock: quantity } });
  if (updated.matchedCount === 0 || !batchNumber) return;

  await Batch.updateOne(
    { organizationId, branchId, productId, batchNumber, status: { $in: ["active", "depleted"] } },
    { $inc: { quantityRemaining: quantity }, $set: { status: "active" } }
  );
}
