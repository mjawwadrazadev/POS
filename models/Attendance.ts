import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAttendance extends Document {
  organizationId: mongoose.Types.ObjectId;
  branchId: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId;
  userName: string;
  userRole: string;
  date: Date;
  clockIn: Date;
  clockOut?: Date;
  totalHours?: number;
  status: "present" | "absent" | "late" | "half_day" | "leave";
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceSchema: Schema<IAttendance> = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    userName: { type: String, required: true },
    userRole: { type: String, default: "cashier" },
    date: { type: Date, required: true, index: true },
    clockIn: { type: Date, required: true },
    clockOut: { type: Date },
    totalHours: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["present", "absent", "late", "half_day", "leave"],
      default: "present",
    },
    notes: { type: String },
  },
  { timestamps: true }
);

AttendanceSchema.index({ organizationId: 1, branchId: 1, date: -1 });

export const Attendance: Model<IAttendance> =
  mongoose.models.Attendance || mongoose.model<IAttendance>("Attendance", AttendanceSchema);
