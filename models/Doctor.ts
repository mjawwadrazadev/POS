import mongoose, { Schema, Document, Model } from "mongoose";

export interface IDoctorFees {
  newPatient: number;
  followUp: number;
  emergency: number;
}

export interface IDoctorTimeSlot {
  start: string;
  end: string;
}

export interface IDoctor extends Document {
  organizationId: mongoose.Types.ObjectId;
  branchId: mongoose.Types.ObjectId;
  name: string;
  specialization: string;
  registrationNumber?: string;
  photo?: string; // Doctor Image URL or Base64 Avatar
  fees: IDoctorFees;
  hospitalCommissionPercent: number;
  paymentArrangement: "hospital_collects_full" | "revenue_share" | "doctor_collects_direct";
  availableDays: string[];
  availableTimeSlots: IDoctorTimeSlot[];
  status: "active" | "inactive";
  createdAt: Date;
  updatedAt: Date;
}

const DoctorSchema: Schema<IDoctor> = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch", required: true },
    name: { type: String, required: true, trim: true },
    specialization: { type: String, required: true, trim: true },
    registrationNumber: { type: String, trim: true },
    photo: { type: String }, // Doctor Image / Avatar
    fees: {
      newPatient: { type: Number, required: true, default: 2000 },
      followUp: { type: Number, default: 1000 },
      emergency: { type: Number, default: 3000 },
    },
    hospitalCommissionPercent: { type: Number, default: 20 }, // e.g. 20% hospital share
    paymentArrangement: {
      type: String,
      enum: ["hospital_collects_full", "revenue_share", "doctor_collects_direct"],
      default: "revenue_share",
    },
    availableDays: [{ type: String }],
    availableTimeSlots: [
      {
        start: { type: String },
        end: { type: String },
      },
    ],
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true }
);

DoctorSchema.index({ organizationId: 1, branchId: 1, status: 1 });

export const Doctor: Model<IDoctor> =
  mongoose.models.Doctor || mongoose.model<IDoctor>("Doctor", DoctorSchema);
