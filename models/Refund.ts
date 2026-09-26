import mongoose, { Schema, Document, Model } from "mongoose";

export interface IRefundItem {
  productId: mongoose.Types.ObjectId;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  refundAmount: number;
  restockFlag: boolean; // true = item returned to inventory, false = damaged/discarded
  reason: string;
}

export interface IRefund extends Document {
  organizationId: mongoose.Types.ObjectId;
  branchId: mongoose.Types.ObjectId;
  originalOrderId: mongoose.Types.ObjectId;
  orderNumber: string;
  items: IRefundItem[];
  totalRefundAmount: number;
  taxAmount: number; // sales tax portion of totalRefundAmount (reversed in the ledger)
  refundMethod: "cash" | "card_reversal" | "store_credit" | "wallet";
  requestedBy: mongoose.Types.ObjectId; // cashier user
  requestedByName: string;
  approvedBy?: mongoose.Types.ObjectId; // manager/admin user
  approvedByName?: string;
  status: "pending_approval" | "approved" | "rejected" | "completed";
  reversingJournalEntryId?: mongoose.Types.ObjectId;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const RefundItemSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  productName: { type: String, required: true },
  sku: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true },
  refundAmount: { type: Number, required: true },
  restockFlag: { type: Boolean, default: true },
  reason: { type: String, required: true, default: "Customer return" },
});

const RefundSchema: Schema<IRefund> = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch", required: true, index: true },
    originalOrderId: { type: Schema.Types.ObjectId, ref: "Order", required: true, index: true },
    orderNumber: { type: String, required: true },
    items: [RefundItemSchema],
    totalRefundAmount: { type: Number, required: true, min: 0 },
    taxAmount: { type: Number, default: 0, min: 0 },
    refundMethod: {
      type: String,
      enum: ["cash", "card_reversal", "store_credit", "wallet"],
      default: "cash",
    },
    requestedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    requestedByName: { type: String, required: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    approvedByName: { type: String },
    status: {
      type: String,
      enum: ["pending_approval", "approved", "rejected", "completed"],
      default: "pending_approval",
    },
    reversingJournalEntryId: { type: Schema.Types.ObjectId, ref: "JournalEntry" },
    notes: { type: String },
  },
  { timestamps: true }
);

export const Refund: Model<IRefund> =
  mongoose.models.Refund || mongoose.model<IRefund>("Refund", RefundSchema);
