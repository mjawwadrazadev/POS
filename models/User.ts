import mongoose, { Schema, Document, Model } from "mongoose";
import bcrypt from "bcryptjs";
import { pinLookupFor, pinLookupKeyId } from "@/lib/auth/pinLookup";

export type UserRole =
  | "super_admin"
  | "platform_admin"
  | "platform_support"
  | "platform_agent"
  | "admin"
  | "manager"
  | "cashier";

export interface IUser extends Document {
  organizationId: mongoose.Types.ObjectId;
  branchId?: mongoose.Types.ObjectId;
  fullName: string;
  email: string;
  password?: string;
  pin: string; // 4-digit cashier quick switch pin (hashed)
  pinLookup?: string; // keyed HMAC of (store, PIN) so PIN login finds the user with one indexed query
  pinLookupKeyId?: string;
  role: UserRole;
  isActive: boolean;
  baseSalary?: number; // monthly base salary used by payroll
  avatar?: string;
  // Platform staff profile (sales agents)
  phone?: string;
  territory?: string; // city / area an agent covers
  commissionRate?: number; // % commission an agent earns on a closed sale
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;

  comparePassword(candidatePassword: string): Promise<boolean>;
  comparePin(candidatePin: string): Promise<boolean>;
}

const UserSchema: Schema<IUser> = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch" },
    fullName: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    password: { type: String, select: false }, // Hashed password, excluded from queries by default
    pin: { type: String, required: true, select: false }, // Hashed 4-digit PIN, excluded by default
    pinLookup: { type: String, select: false },
    pinLookupKeyId: { type: String, select: false },
    role: { type: String, enum: ["super_admin", "platform_admin", "platform_support", "platform_agent", "admin", "manager", "cashier"], default: "cashier" },
    isActive: { type: Boolean, default: true },
    baseSalary: { type: Number, min: 0 },
    avatar: { type: String },
    phone: { type: String, trim: true },
    territory: { type: String, trim: true },
    commissionRate: { type: Number, min: 0, max: 100 },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// Email is the global login identifier, so it must be unique across the whole platform
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ organizationId: 1, pinLookup: 1 });

// Pre-save hook to hash password and PIN
UserSchema.pre("save", async function (next) {
  if (this.isModified("password") && this.password) {
    if (!this.password.startsWith("$2a$") && !this.password.startsWith("$2b$")) {
      this.password = await bcrypt.hash(this.password, 12);
    }
  }

  if (this.isModified("pin") && this.pin) {
    if (!this.pin.startsWith("$2a$") && !this.pin.startsWith("$2b$")) {
      // The plain PIN is only available here, before hashing
      this.pinLookup = pinLookupFor(this.organizationId, this.pin);
      this.pinLookupKeyId = pinLookupKeyId();
      this.pin = await bcrypt.hash(this.pin, 10);
    }
  }

  next();
});

// Instance method to compare password
UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

// Instance method to compare PIN
UserSchema.methods.comparePin = async function (candidatePin: string): Promise<boolean> {
  if (!this.pin) return false;
  return bcrypt.compare(candidatePin, this.pin);
};

export const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
