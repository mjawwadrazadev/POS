import mongoose, { Schema, Document, Model } from "mongoose";

export interface IConsultationBill extends Document {
  organizationId: mongoose.Types.ObjectId;
  branchId: mongoose.Types.ObjectId;
  receiptNumber: string; // e.g. "HSP-000123"
  perchiNumber: number; // Patient Token / Perchi Number (Daily counter e.g. 1, 2, 3...)
  doctorId: mongoose.Types.ObjectId;
  doctorNameSnapshot: string;
  doctorSpecializationSnapshot?: string;
  doctorPhotoSnapshot?: string;
  visitType: "new_patient" | "follow_up" | "emergency";
  feeCharged: number;
  patientName: string;
  patientPhone?: string;
  patientAge?: number;
  patientGender?: "male" | "female" | "other";
  paymentMethod: "cash" | "card" | "wallet";
  receptionistId?: mongoose.Types.ObjectId;
  receptionistName?: string;
  consultationTime: string; // Formatted consultation time e.g. "11:45 AM"
  status: "completed" | "refunded";
  createdAt: Date;
  updatedAt: Date;
}

const ConsultationBillSchema: Schema<IConsultationBill> = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch", required: true },
    receiptNumber: { type: String, required: true, unique: true },
    perchiNumber: { type: Number, required: true }, // Perchi No / Patient Token No
    doctorId: { type: Schema.Types.ObjectId, ref: "Doctor", required: true },
    doctorNameSnapshot: { type: String, required: true },
    doctorSpecializationSnapshot: { type: String },
    doctorPhotoSnapshot: { type: String },
    visitType: {
      type: String,
      enum: ["new_patient", "follow_up", "emergency"],
      default: "new_patient",
    },
    feeCharged: { type: Number, required: true },
    patientName: { type: String, required: true, trim: true },
    patientPhone: { type: String, trim: true },
    patientAge: { type: Number },
    patientGender: { type: String, enum: ["male", "female", "other"], default: "male" },
    paymentMethod: { type: String, enum: ["cash", "card", "wallet"], default: "cash" },
    receptionistId: { type: Schema.Types.ObjectId, ref: "User" },
    receptionistName: { type: String, default: "Receptionist" },
    consultationTime: { type: String, required: true }, // e.g. "11:45 AM"
    status: { type: String, enum: ["completed", "refunded"], default: "completed" },
  },
  { timestamps: true }
);

ConsultationBillSchema.index({ organizationId: 1, doctorId: 1, createdAt: -1 });

export const ConsultationBill: Model<IConsultationBill> =
  mongoose.models.ConsultationBill ||
  mongoose.model<IConsultationBill>("ConsultationBill", ConsultationBillSchema);
