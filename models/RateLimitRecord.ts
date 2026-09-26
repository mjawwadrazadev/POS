import mongoose, { Schema, Document, Model } from "mongoose";

export interface IRateLimitRecord extends Document {
  key: string;
  count: number;
  windowStart: Date;
  expiresAt: Date;
}

const RateLimitRecordSchema: Schema<IRateLimitRecord> = new Schema({
  key: { type: String, required: true, unique: true },
  count: { type: Number, required: true, default: 0 },
  windowStart: { type: Date, required: true },
  expiresAt: { type: Date, required: true },
});

// MongoDB TTL monitor removes records once their window has passed
RateLimitRecordSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RateLimitRecord: Model<IRateLimitRecord> =
  mongoose.models.RateLimitRecord || mongoose.model<IRateLimitRecord>("RateLimitRecord", RateLimitRecordSchema);
