import mongoose, { Schema, Document, Model } from "mongoose";
import bcrypt from "bcryptjs";

export type UserRole = "super_admin" | "platform_support" | "admin" | "manager" | "cashier";

export interface IUser extends Document {
  organizationId: mongoose.Types.ObjectId;
  branchId?: mongoose.Types.ObjectId;
  fullName: string;
  email: string;
  password?: string;
  pin: string; // 4-digit cashier quick switch pin (hashed)
  role: UserRole;
  isActive: boolean;
  baseSalary?: number; // monthly base salary used by payroll
  avatar?: string;
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
    role: { type: String, enum: ["super_admin", "platform_support", "admin", "manager", "cashier"], default: "cashier" },
    isActive: { type: Boolean, default: true },
    baseSalary: { type: Number, min: 0 },
    avatar: { type: String },
  },
  { timestamps: true }
);

// Email is the global login identifier, so it must be unique across the whole platform
UserSchema.index({ email: 1 }, { unique: true });

// Pre-save hook to hash password and PIN
UserSchema.pre("save", async function (next) {
  if (this.isModified("password") && this.password) {
    if (!this.password.startsWith("$2a$") && !this.password.startsWith("$2b$")) {
      this.password = await bcrypt.hash(this.password, 12);
    }
  }

  if (this.isModified("pin") && this.pin) {
    if (!this.pin.startsWith("$2a$") && !this.pin.startsWith("$2b$")) {
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
