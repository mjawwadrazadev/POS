import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAnnouncement extends Document {
  title: string;
  content: string;
  type: "info" | "warning" | "maintenance" | "feature";
  targetVerticals: string[]; // e.g. ["restaurant", "pharmacy"] or ["all"]
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AnnouncementSchema: Schema<IAnnouncement> = new Schema(
  {
    title: { type: String, required: true },
    content: { type: String, required: true },
    type: { type: String, enum: ["info", "warning", "maintenance", "feature"], default: "info" },
    targetVerticals: { type: [String], default: ["all"] },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    expiresAt: { type: Date },
  },
  { timestamps: true }
);

export const Announcement: Model<IAnnouncement> =
  mongoose.models.Announcement || mongoose.model<IAnnouncement>("Announcement", AnnouncementSchema);
