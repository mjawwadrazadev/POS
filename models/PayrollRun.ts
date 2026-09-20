import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPayrollEntry {
  userId?: mongoose.Types.ObjectId;
  userName: string;
  userRole: string;
  baseSalary: number;
  commissionEarned: number;
  deductions: number;
  netPay: number;
}

export interface IPayrollRun extends Document {
  organizationId: mongoose.Types.ObjectId;
  branchId: mongoose.Types.ObjectId;
  month: string; // "2026-09"
  entries: IPayrollEntry[];
  totalPayroll: number;
  status: "draft" | "approved" | "paid";
  approvedBy?: string;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PayrollEntrySchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User" },
  userName: { type: String, required: true },
  userRole: { type: String, default: "cashier" },
  baseSalary: { type: Number, required: true, default: 0 },
  commissionEarned: { type: Number, default: 0 },
  deductions: { type: Number, default: 0 },
  netPay: { type: Number, required: true },
});

const PayrollRunSchema: Schema<IPayrollRun> = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch", required: true, index: true },
    month: { type: String, required: true },
    entries: [PayrollEntrySchema],
    totalPayroll: { type: Number, required: true, default: 0 },
    status: { type: String, enum: ["draft", "approved", "paid"], default: "draft" },
    approvedBy: { type: String },
    paidAt: { type: Date },
  },
  { timestamps: true }
);

PayrollRunSchema.index({ organizationId: 1, month: 1 });

export const PayrollRun: Model<IPayrollRun> =
  mongoose.models.PayrollRun || mongoose.model<IPayrollRun>("PayrollRun", PayrollRunSchema);
