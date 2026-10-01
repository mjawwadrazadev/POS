import crypto from "crypto";
import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPasswordResetToken extends Document {
  userId: mongoose.Types.ObjectId;
  email: string;
  tokenHash: string; // SHA-256 of the emailed token — the token itself is never stored
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PasswordResetTokenSchema: Schema<IPasswordResetToken> = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    used: { type: Boolean, default: false },
  },
  { timestamps: true }
);

PasswordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // Auto purge expired tokens

export const PasswordResetToken: Model<IPasswordResetToken> =
  mongoose.models.PasswordResetToken ||
  mongoose.model<IPasswordResetToken>("PasswordResetToken", PasswordResetTokenSchema);

export function hashResetToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
