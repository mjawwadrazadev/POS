import mongoose, { Schema, Document, Model } from "mongoose";
import { BusinessType } from "@/lib/config/verticals";

export interface IPaymentRecord {
  amount: number;
  paymentDate: Date;
  monthsAdded: number;
  notes?: string;
}

export interface IOrganization extends Document {
  name: string;
  code: string;
  businessType: BusinessType;
  currency: string;
  taxRate: number;
  phone?: string;
  email?: string;
  address?: string;
  // Plan Tier & Retention Fields
  planTier: "billing_only" | "billing_accounting";
  accountingEnabled: boolean;
  dataRetentionMonths: number; // 6, 12, 24, 0 (0 = lifetime)
  planPriceAtSelection?: number;
  // Subscription & Expiry Fields
  subscriptionPlan: "monthly" | "yearly" | "custom";
  subscriptionFee: number; // e.g. 5000 per month
  subscriptionStatus: "active" | "expiring_soon" | "expired" | "suspended";
  startDate: Date;
  expiryDate: Date;
  lastPaymentDate?: Date;
  paymentHistory: IPaymentRecord[];
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
    // Plan Tier & Retention
    planTier: {
      type: String,
      enum: ["billing_only", "billing_accounting"],
      default: "billing_accounting",
    },
    accountingEnabled: { type: Boolean, default: true },
    dataRetentionMonths: { type: Number, default: 6 },
    planPriceAtSelection: { type: Number, default: 5000 },
    // Subscription & Expiry
    subscriptionPlan: {
      type: String,
      enum: ["monthly", "yearly", "custom"],
      default: "monthly",
    },
    subscriptionFee: { type: Number, default: 5000 },
    subscriptionStatus: {
      type: String,
      enum: ["active", "expiring_soon", "expired", "suspended"],
      default: "active",
    },
    startDate: { type: Date, default: Date.now },
    expiryDate: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default 30 days access
    },
    lastPaymentDate: { type: Date, default: Date.now },
    paymentHistory: [
      {
        amount: { type: Number, required: true },
        paymentDate: { type: Date, default: Date.now },
        monthsAdded: { type: Number, required: true, default: 1 },
        notes: { type: String },
      },
    ],
  },
  { timestamps: true }
);

export const Organization: Model<IOrganization> =
  mongoose.models.Organization || mongoose.model<IOrganization>("Organization", OrganizationSchema);
