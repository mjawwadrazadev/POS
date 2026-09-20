import mongoose, { Schema, Document, Model } from "mongoose";

export interface ITable extends Document {
  organizationId: mongoose.Types.ObjectId;
  branchId: mongoose.Types.ObjectId;
  label: string;
  capacity: number;
  positionX: number;
  positionY: number;
  shape: "square" | "round" | "rect";
  status: "available" | "occupied" | "reserved" | "dirty";
  currentOrderId?: mongoose.Types.ObjectId;
  mergedWith?: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const TableSchema: Schema<ITable> = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch", required: true, index: true },
    label: { type: String, required: true },
    capacity: { type: Number, default: 4 },
    positionX: { type: Number, default: 0 },
    positionY: { type: Number, default: 0 },
    shape: { type: String, enum: ["square", "round", "rect"], default: "square" },
    status: { type: String, enum: ["available", "occupied", "reserved", "dirty"], default: "available" },
    currentOrderId: { type: Schema.Types.ObjectId, ref: "Order" },
    mergedWith: [{ type: Schema.Types.ObjectId, ref: "Table" }],
  },
  { timestamps: true }
);

TableSchema.index({ organizationId: 1, branchId: 1 });

export const Table: Model<ITable> =
  mongoose.models.Table || mongoose.model<ITable>("Table", TableSchema);
