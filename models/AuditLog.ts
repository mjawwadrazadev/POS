import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAuditLog extends Document {
  organizationId: mongoose.Types.ObjectId;
  branchId?: mongoose.Types.ObjectId;
  actorId: mongoose.Types.ObjectId;
  actorName: string;
  actorRole: string;
  action: string; // "order.void", "product.price_change", "stock.adjust", "refund.approve", "login.success", "login.failed"
  targetCollection: string; // "Order", "Product", "Refund", "User"
  targetId?: mongoose.Types.ObjectId;
  before?: any;
  after?: any;
  ipAddress?: string;
  createdAt: Date;
}

const AuditLogSchema: Schema<IAuditLog> = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch" },
    actorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    actorName: { type: String, required: true },
    actorRole: { type: String, required: true },
    action: { type: String, required: true, index: true },
    targetCollection: { type: String, required: true },
    targetId: { type: Schema.Types.ObjectId },
    before: { type: Schema.Types.Mixed },
    after: { type: Schema.Types.Mixed },
    ipAddress: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } } // Append-only immutable log
);

AuditLogSchema.index({ organizationId: 1, createdAt: -1 });

export const AuditLog: Model<IAuditLog> =
  mongoose.models.AuditLog || mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);
