import mongoose from "mongoose";
import { Batch } from "@/models/Batch";
import { Product } from "@/models/Product";

export interface FEFODeductionResult {
  deductedBatches: {
    batchId: string;
    batchNumber: string;
    quantityDeducted: number;
    expiryDate: Date;
  }[];
  primaryBatchNumber?: string;
}

/**
 * Deducts product stock using First-Expired, First-Out (FEFO) methodology.
 * Checks for expired batches and blocks checkout if the item is expired.
 */
export async function deductStockFEFO(
  productId: string | mongoose.Types.ObjectId,
  branchId: string | mongoose.Types.ObjectId,
  requestedQuantity: number
): Promise<FEFODeductionResult> {
  const now = new Date();

  // Find all active batches sorted by earliest expiry date first
  const batches = await Batch.find({
    productId,
    branchId,
    status: "active",
    quantityRemaining: { $gt: 0 },
  }).sort({ expiryDate: 1 });

  // Check if earliest batch is already expired
  for (const b of batches) {
    if (b.expiryDate < now) {
      b.status = "expired";
      await b.save();
    }
  }

  // Filter out any newly expired batches
  const validBatches = batches.filter((b) => b.expiryDate >= now && b.quantityRemaining > 0);

  let remainingToDeduct = requestedQuantity;
  const deductedBatches: FEFODeductionResult["deductedBatches"] = [];

  if (validBatches.length > 0) {
    for (const batch of validBatches) {
      if (remainingToDeduct <= 0) break;

      const deductAmount = Math.min(batch.quantityRemaining, remainingToDeduct);
      batch.quantityRemaining -= deductAmount;
      if (batch.quantityRemaining === 0) {
        batch.status = "depleted";
      }
      await batch.save();

      remainingToDeduct -= deductAmount;
      deductedBatches.push({
        batchId: (batch._id as mongoose.Types.ObjectId).toString(),
        batchNumber: batch.batchNumber,
        quantityDeducted: deductAmount,
        expiryDate: batch.expiryDate,
      });
    }

    if (remainingToDeduct > 0) {
      throw new Error(
        `Insufficient non-expired batch inventory. Needed: ${requestedQuantity}, short by: ${remainingToDeduct}`
      );
    }
  }

  // Also update overall Product stock count
  const product = await Product.findById(productId);
  if (product) {
    if (product.stock < requestedQuantity) {
      throw new Error(`Insufficient overall product stock for ${product.name}. Available: ${product.stock}`);
    }
    product.stock -= requestedQuantity;
    await product.save();
  }

  return {
    deductedBatches,
    primaryBatchNumber: deductedBatches[0]?.batchNumber || product?.batchNumber || "DEFAULT",
  };
}
