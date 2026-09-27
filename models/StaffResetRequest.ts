import mongoose, { Schema, Document, Model } from "mongoose";

/**
 * An employee (manager/cashier) who forgot their password or PIN. Staff never get a self-service reset
 * link: the request goes to their own store's admin (the owner), who sets new credentials. Platform
 * staff never see these.
 */

export type StaffResetStatus = "pending" | "resolved" | "dismissed";

export interface IStaffResetRequest extends Document {
  organizationId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  userName: string;
  userEmail: string;
  userRole: string;
  status: StaffResetStatus;
  resolvedBy?: mongoose.Types.ObjectId;
  resolvedByName?: string;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const StaffResetRequestSchema: Schema<IStaffResetRequest> = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    userName: { type: String, required: true },
    userEmail: { type: String, required: true },
    userRole: { type: String, required: true },
    status: { type: String, enum: ["pending", "resolved", "dismissed"], default: "pending" },
    resolvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    resolvedByName: { type: String },
    resolvedAt: { type: Date },
  },
  { timestamps: true }
);

StaffResetRequestSchema.index({ organizationId: 1, status: 1, createdAt: -1 });

export const StaffResetRequest: Model<IStaffResetRequest> =
  mongoose.models.StaffResetRequest ||
  mongoose.model<IStaffResetRequest>("StaffResetRequest", StaffResetRequestSchema);
