import mongoose, { Schema, Document, Model } from "mongoose";

export interface IBatch extends Document {
  organizationId: mongoose.Types.ObjectId;
  branchId: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  batchNumber: string;
  expiryDate: Date;
  quantityReceived: number;
  quantityRemaining: number;
  costPrice: number;
  status: "active" | "expired" | "depleted";
  createdAt: Date;
  updatedAt: Date;
}

const BatchSchema: Schema<IBatch> = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch", required: true, index: true },
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    batchNumber: { type: String, required: true },
    expiryDate: { type: Date, required: true, index: true },
    quantityReceived: { type: Number, required: true, min: 0 },
    quantityRemaining: { type: Number, required: true, min: 0 },
    costPrice: { type: Number, required: true, default: 0 },
    status: { type: String, enum: ["active", "expired", "depleted"], default: "active" },
  },
  { timestamps: true }
);

BatchSchema.index({ productId: 1, branchId: 1, expiryDate: 1 });

export const Batch: Model<IBatch> =
  mongoose.models.Batch || mongoose.model<IBatch>("Batch", BatchSchema);
