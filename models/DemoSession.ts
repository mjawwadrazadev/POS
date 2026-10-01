import mongoose, { Schema, Document, Model } from "mongoose";
import { BusinessType } from "@/lib/config/verticals";

export type DemoOutcome = "pending" | "successful" | "unsuccessful";
export type DemoSatisfaction = "satisfied" | "neutral" | "not_satisfied";
export type DemoCloseChance = "high" | "medium" | "low" | "none";

/**
 * One demo an agent gave to a prospective client. The demo store itself (an Organization with
 * isDemo = true) lives for 24 hours and is then deleted with all of its data; this record stays
 * so the agent, admins and the super admin can follow the agent's progress.
 */
export interface IDemoSession extends Document {
  agentId: mongoose.Types.ObjectId;
  agentName: string;
  businessType: BusinessType;
  clientName: string;
  clientBusinessName: string;
  clientPhone?: string;
  clientCity?: string;
  notes?: string;

  // The temporary demo store (cleared once it is deleted)
  organizationId?: mongoose.Types.ObjectId;
  storeCode: string;
  demoEmail?: string;
  demoPassword?: string; // throwaway login for the demo store, wiped at cleanup
  demoPin?: string; // throwaway PIN for the demo store, wiped at cleanup

  status: "active" | "expired";
  expiresAt: Date;
  endedAt?: Date;
  endedReason?: "expired" | "ended_by_agent";
  activity?: { orders: number; sales: number; products: number };

  // Agent's report after the demo
  outcome: DemoOutcome;
  satisfaction?: DemoSatisfaction;
  closeChance?: DemoCloseChance;
  converted: boolean; // client bought a subscription
  feedback?: string;
  followUpDate?: Date;
  reportedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const DemoSessionSchema = new Schema<IDemoSession>(
  {
    agentId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    agentName: { type: String, required: true },
    businessType: { type: String, required: true },
    clientName: { type: String, required: true, trim: true },
    clientBusinessName: { type: String, required: true, trim: true },
    clientPhone: { type: String, trim: true },
    clientCity: { type: String, trim: true },
    notes: { type: String },

    organizationId: { type: Schema.Types.ObjectId, ref: "Organization" },
    storeCode: { type: String, required: true },
    demoEmail: { type: String },
    demoPassword: { type: String, select: false },
    demoPin: { type: String, select: false },

    status: { type: String, enum: ["active", "expired"], default: "active", index: true },
    expiresAt: { type: Date, required: true, index: true },
    endedAt: { type: Date },
    endedReason: { type: String, enum: ["expired", "ended_by_agent"] },
    activity: {
      orders: { type: Number, default: 0 },
      sales: { type: Number, default: 0 },
      products: { type: Number, default: 0 },
    },

    outcome: { type: String, enum: ["pending", "successful", "unsuccessful"], default: "pending" },
    satisfaction: { type: String, enum: ["satisfied", "neutral", "not_satisfied"] },
    closeChance: { type: String, enum: ["high", "medium", "low", "none"] },
    converted: { type: Boolean, default: false },
    feedback: { type: String },
    followUpDate: { type: Date },
    reportedAt: { type: Date },
  },
  { timestamps: true }
);

DemoSessionSchema.index({ agentId: 1, createdAt: -1 });

export const DemoSession: Model<IDemoSession> =
  mongoose.models.DemoSession || mongoose.model<IDemoSession>("DemoSession", DemoSessionSchema);
