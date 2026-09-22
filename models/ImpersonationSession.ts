import mongoose, { Schema, Document, Model } from "mongoose";

export interface IImpersonationSession extends Document {
  superAdminId: mongoose.Types.ObjectId;
  targetOrganizationId: mongoose.Types.ObjectId;
  targetUserId?: mongoose.Types.ObjectId;
  reason: string;
  startedAt: Date;
  expiresAt: Date;
  endedAt?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ImpersonationSessionSchema: Schema<IImpersonationSession> = new Schema(
  {
    superAdminId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    targetOrganizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    targetUserId: { type: Schema.Types.ObjectId, ref: "User" },
    reason: { type: String, required: true },
    startedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true }, // e.g. startedAt + 30 mins
    endedAt: { type: Date },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const ImpersonationSession: Model<IImpersonationSession> =
  mongoose.models.ImpersonationSession || mongoose.model<IImpersonationSession>("ImpersonationSession", ImpersonationSessionSchema);
