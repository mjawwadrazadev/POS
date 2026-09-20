import mongoose, { Schema, Document, Model } from "mongoose";

export interface IStockTransferItem {
  productId: mongoose.Types.ObjectId;
  productName: string;
  sku: string;
  quantity: number;
}

export interface IStockTransfer extends Document {
  organizationId: mongoose.Types.ObjectId;
  transferNumber: string;
  fromBranchId: mongoose.Types.ObjectId;
  toBranchId: mongoose.Types.ObjectId;
  items: IStockTransferItem[];
  status: "pending" | "in_transit" | "received" | "cancelled";
  notes?: string;
  requestedBy: string;
  approvedBy?: string;
  receivedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const StockTransferItemSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  productName: { type: String, required: true },
  sku: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
});

const StockTransferSchema: Schema<IStockTransfer> = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    transferNumber: { type: String, required: true, unique: true },
    fromBranchId: { type: Schema.Types.ObjectId, ref: "Branch", required: true, index: true },
    toBranchId: { type: Schema.Types.ObjectId, ref: "Branch", required: true, index: true },
    items: [StockTransferItemSchema],
    status: {
      type: String,
      enum: ["pending", "in_transit", "received", "cancelled"],
      default: "pending",
    },
    notes: { type: String },
    requestedBy: { type: String, default: "Manager" },
    approvedBy: { type: String },
    receivedAt: { type: Date },
  },
  { timestamps: true }
);

StockTransferSchema.index({ organizationId: 1, status: 1, createdAt: -1 });

export const StockTransfer: Model<IStockTransfer> =
  mongoose.models.StockTransfer || mongoose.model<IStockTransfer>("StockTransfer", StockTransferSchema);
