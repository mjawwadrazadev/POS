import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPaymentHistory extends Document {
  organizationId: mongoose.Types.ObjectId;
  tenantName: string;
  amount: number;
  currency: string;
  planTier: "billing_only" | "billing_accounting";
  billingCycle: "monthly" | "yearly" | "custom";
  monthsAdded: number;
  paymentMethod: "cash" | "bank_transfer" | "stripe" | "cheque" | "manual";
  transactionReference?: string;
  paidAt: Date;
  expiresAt: Date;
  notes?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentHistorySchema: Schema<IPaymentHistory> = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    tenantName: { type: String, required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: "PKR" },
    planTier: { type: String, enum: ["billing_only", "billing_accounting"], default: "billing_accounting" },
    billingCycle: { type: String, enum: ["monthly", "yearly", "custom"], default: "monthly" },
    monthsAdded: { type: Number, required: true, default: 1 },
    paymentMethod: { type: String, enum: ["cash", "bank_transfer", "stripe", "cheque", "manual"], default: "cash" },
    transactionReference: { type: String },
    paidAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
    notes: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

export const PaymentHistory: Model<IPaymentHistory> =
  mongoose.models.PaymentHistory || mongoose.model<IPaymentHistory>("PaymentHistory", PaymentHistorySchema);
