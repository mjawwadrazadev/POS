import mongoose, { Schema, Document, Model } from "mongoose";

// A demo/price enquiry from the public website contact form, followed up by the platform team.

export type LeadStatus = "new" | "contacted" | "won" | "lost";

export interface ILead extends Document {
  name: string;
  email: string;
  company?: string;
  phone?: string;
  businessType?: string;
  message: string;
  status: LeadStatus;
  notes?: string;
  ipAddress?: string;
  emailedTo?: string;
  emailError?: string;
  createdAt: Date;
  updatedAt: Date;
}

const LeadSchema: Schema<ILead> = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    company: { type: String, trim: true },
    phone: { type: String, trim: true },
    businessType: { type: String, trim: true },
    message: { type: String, required: true },
    status: { type: String, enum: ["new", "contacted", "won", "lost"], default: "new", index: true },
    notes: { type: String },
    ipAddress: { type: String },
    emailedTo: { type: String },
    emailError: { type: String },
  },
  { timestamps: true }
);

LeadSchema.index({ createdAt: -1 });

export const Lead: Model<ILead> = mongoose.models.Lead || mongoose.model<ILead>("Lead", LeadSchema);
