import mongoose, { Schema, Document, Model } from "mongoose";
import { BusinessType } from "@/lib/config/verticals";
import type { FbrEnvironment, FbrMode } from "@/lib/fbr/constants";

export interface IPaymentRecord {
  amount: number;
  paymentDate: Date;
  monthsAdded: number;
  notes?: string;
}

export interface IFbrSettings {
  enabled: boolean;
  mode: FbrMode;
  environment: FbrEnvironment;
  ntn: string; // seller NTN (7 digits) or CNIC (13 digits)
  strn?: string; // sales tax registration number
  businessName?: string; // name as registered with FBR
  province?: string; // DI seller province
  address?: string; // DI seller address
  posId?: string; // POS Integration: POS registration number from IRIS
  token?: string; // FBR/PRAL security token — never selected by default
  defaultHsCode?: string; // HS/PCT code used when a product has none
  saleType?: string; // DI sale type
  scenarioId?: string; // DI sandbox scenario
  updatedAt?: Date;
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
  planLimits?: {
    maxBranches: number;
    maxStaffUsers: number;
  };
  // Subscription & Expiry Fields
  subscriptionPlan: "monthly" | "yearly" | "custom";
  subscriptionFee: number; // e.g. 5000 per month
  subscriptionStatus: "active" | "expiring_soon" | "expired" | "suspended" | "suspended_manual" | "terminated";
  startDate: Date;
  expiryDate: Date;
  lastPaymentDate?: Date;
  paymentHistory: IPaymentRecord[];
  fbr?: IFbrSettings;
  createdAt: Date;
  updatedAt: Date;
}

const OrganizationSchema: Schema<IOrganization> = new Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, lowercase: true, trim: true },
    businessType: {
      type: String,
      enum: ["restaurant", "cafe", "bakery", "pharmacy", "retail", "supermarket", "electronics", "clothing", "salon", "hospital"],
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
    planLimits: {
      maxBranches: { type: Number, default: 5 },
      maxStaffUsers: { type: Number, default: 20 },
    },
    // Subscription & Expiry
    subscriptionPlan: {
      type: String,
      enum: ["monthly", "yearly", "custom"],
      default: "monthly",
    },
    subscriptionFee: { type: Number, default: 5000 },
    subscriptionStatus: {
      type: String,
      enum: ["active", "expiring_soon", "expired", "suspended", "suspended_manual", "terminated"],
      default: "active",
    },
    startDate: { type: Date, default: Date.now },
    expiryDate: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default 30 days access
    },
    lastPaymentDate: { type: Date, default: Date.now },
    // FBR integration — optional; stores that are not registered with FBR leave it disabled
    fbr: {
      enabled: { type: Boolean, default: false },
      mode: { type: String, enum: ["pos_ims", "digital_invoicing"], default: "pos_ims" },
      environment: { type: String, enum: ["sandbox", "production"], default: "sandbox" },
      ntn: { type: String, trim: true },
      strn: { type: String, trim: true },
      businessName: { type: String, trim: true },
      province: { type: String, trim: true },
      address: { type: String, trim: true },
      posId: { type: String, trim: true },
      token: { type: String, select: false },
      defaultHsCode: { type: String, trim: true },
      saleType: { type: String, trim: true },
      scenarioId: { type: String, trim: true },
      updatedAt: { type: Date },
    },
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
