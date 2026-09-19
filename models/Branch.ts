import mongoose, { Schema, Document, Model } from "mongoose";

export interface IBranch extends Document {
  organizationId: mongoose.Types.ObjectId;
  name: string;
  code: string;
  city: string;
  address?: string;
  phone?: string;
  isMain: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const BranchSchema: Schema<IBranch> = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    city: { type: String, required: true },
    address: { type: String },
    phone: { type: String },
    isMain: { type: Boolean, default: false },
  },
  { timestamps: true }
);

BranchSchema.index({ organizationId: 1, code: 1 }, { unique: true });

export const Branch: Model<IBranch> =
  mongoose.models.Branch || mongoose.model<IBranch>("Branch", BranchSchema);
