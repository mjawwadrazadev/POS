import mongoose, { Schema, Document, Model } from "mongoose";

export interface IMonthlyRevenueSnapshot extends Document {
  monthKey: string; // e.g., "2026-09"
  totalMRR: number;
  totalRevenueCollected: number;
  totalTenants: number;
  activeTenants: number;
  arpu: number; // Average Revenue Per User
  revenueByVertical: Array<{ vertical: string; amount: number }>;
  revenueByPlan: Array<{ planTier: string; amount: number }>;
  calculatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MonthlyRevenueSnapshotSchema: Schema<IMonthlyRevenueSnapshot> = new Schema(
  {
    monthKey: { type: String, required: true, unique: true },
    totalMRR: { type: Number, default: 0 },
    totalRevenueCollected: { type: Number, default: 0 },
    totalTenants: { type: Number, default: 0 },
    activeTenants: { type: Number, default: 0 },
    arpu: { type: Number, default: 0 },
    revenueByVertical: [
      {
        vertical: { type: String },
        amount: { type: Number },
      },
    ],
    revenueByPlan: [
      {
        planTier: { type: String },
        amount: { type: Number },
      },
    ],
    calculatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const MonthlyRevenueSnapshot: Model<IMonthlyRevenueSnapshot> =
  mongoose.models.MonthlyRevenueSnapshot || mongoose.model<IMonthlyRevenueSnapshot>("MonthlyRevenueSnapshot", MonthlyRevenueSnapshotSchema);
