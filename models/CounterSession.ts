import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICounterSession extends Document {
  organizationId: mongoose.Types.ObjectId;
  branchId: mongoose.Types.ObjectId;
  cashierId?: mongoose.Types.ObjectId;
  cashierName: string;
  openedAt: Date;
  openingFloat: number;
  closedAt?: Date;
  expectedCashInDrawer?: number;
  actualCountedCash?: number;
  variance?: number; // actualCountedCash - expectedCashInDrawer (negative = shortage, positive = overage)
  notes?: string;
  status: "open" | "closed" | "force_closed";
  createdAt: Date;
  updatedAt: Date;
}

const CounterSessionSchema: Schema<ICounterSession> = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch", required: true, index: true },
    cashierId: { type: Schema.Types.ObjectId, ref: "User" },
    cashierName: { type: Schema.Types.ObjectId ? String : String, required: true, default: "Main Cashier" },
    openedAt: { type: Date, default: Date.now },
    openingFloat: { type: Number, required: true, default: 0 },
    closedAt: { type: Date },
    expectedCashInDrawer: { type: Number, default: 0 },
    actualCountedCash: { type: Number, default: 0 },
    variance: { type: Number, default: 0 },
    notes: { type: String },
    status: { type: String, enum: ["open", "closed", "force_closed"], default: "open" },
  },
  { timestamps: true }
);

CounterSessionSchema.index({ organizationId: 1, branchId: 1, status: 1 });

export const CounterSession: Model<ICounterSession> =
  mongoose.models.CounterSession || mongoose.model<ICounterSession>("CounterSession", CounterSessionSchema);
