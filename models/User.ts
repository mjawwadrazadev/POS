import mongoose, { Schema, Document, Model } from "mongoose";

export type UserRole = "super_admin" | "admin" | "manager" | "cashier";

export interface IUser extends Document {
  organizationId: mongoose.Types.ObjectId;
  branchId?: mongoose.Types.ObjectId;
  fullName: string;
  email: string;
  pin: string; // 4-digit cashier quick switch pin
  role: UserRole;
  isActive: boolean;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema<IUser> = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch" },
    fullName: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    pin: { type: String, required: true, default: "1234" },
    role: { type: String, enum: ["super_admin", "admin", "manager", "cashier"], default: "cashier" },
    isActive: { type: Boolean, default: true },
    avatar: { type: String },
  },
  { timestamps: true }
);

UserSchema.index({ organizationId: 1, email: 1 }, { unique: true });

export const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
