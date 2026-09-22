import mongoose, { Schema, Document, Model } from "mongoose";

export interface ITenantHealthSnapshot extends Document {
  organizationId: mongoose.Types.ObjectId;
  tenantName: string;
  vertical: string;
  snapshotDate: Date;
  orders7Days: number;
  orders30Days: number;
  activeStaffCount: number;
  lastLoginAt?: Date;
  daysSinceLastSale: number;
  healthStatus: "active" | "slowing" | "dormant";
  createdAt: Date;
  updatedAt: Date;
}

const TenantHealthSnapshotSchema: Schema<ITenantHealthSnapshot> = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    tenantName: { type: String, required: true },
    vertical: { type: String, required: true },
    snapshotDate: { type: Date, default: Date.now },
    orders7Days: { type: Number, default: 0 },
    orders30Days: { type: Number, default: 0 },
    activeStaffCount: { type: Number, default: 0 },
    lastLoginAt: { type: Date },
    daysSinceLastSale: { type: Number, default: 999 },
    healthStatus: { type: String, enum: ["active", "slowing", "dormant"], default: "dormant" },
  },
  { timestamps: true }
);

export const TenantHealthSnapshot: Model<ITenantHealthSnapshot> =
  mongoose.models.TenantHealthSnapshot || mongoose.model<ITenantHealthSnapshot>("TenantHealthSnapshot", TenantHealthSnapshotSchema);
