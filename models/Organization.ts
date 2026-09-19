import mongoose, { Schema, Document, Model } from "mongoose";
import { BusinessType } from "@/lib/config/verticals";

export interface IOrganization extends Document {
  name: string;
  code: string;
  businessType: BusinessType;
  currency: string;
  taxRate: number;
  phone?: string;
  email?: string;
  address?: string;
  createdAt: Date;
  updatedAt: Date;
}

const OrganizationSchema: Schema<IOrganization> = new Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, lowercase: true, trim: true },
    businessType: {
      type: String,
      enum: ["restaurant", "cafe", "bakery", "pharmacy", "retail", "supermarket", "electronics", "clothing", "salon"],
      default: "bakery",
    },
    currency: { type: String, default: "PKR" },
    taxRate: { type: Number, default: 16.0 },
    phone: { type: String },
    email: { type: String },
    address: { type: String },
  },
  { timestamps: true }
);

export const Organization: Model<IOrganization> =
  mongoose.models.Organization || mongoose.model<IOrganization>("Organization", OrganizationSchema);
