import mongoose, { Schema, Document, Model } from "mongoose";

export interface IKotItem {
  productId: mongoose.Types.ObjectId;
  productName: string;
  quantity: number;
  notes?: string;
  station?: string; // "grill" | "drinks" | "mains" | "bakery"
}

export interface IKotTicket extends Document {
  organizationId: mongoose.Types.ObjectId;
  branchId: mongoose.Types.ObjectId;
  orderId?: mongoose.Types.ObjectId;
  orderNumber: string;
  tableNumber?: string;
  orderType: string;
  items: IKotItem[];
  status: "queued" | "preparing" | "ready" | "served";
  priority: "normal" | "rush";
  createdAt: Date;
  updatedAt: Date;
}

const KotItemSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  productName: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  notes: { type: String },
  station: { type: String, default: "mains" },
});

const KotTicketSchema: Schema<IKotTicket> = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch", required: true, index: true },
    orderId: { type: Schema.Types.ObjectId, ref: "Order" },
    orderNumber: { type: String, required: true },
    tableNumber: { type: String },
    orderType: { type: String, default: "dine_in" },
    items: [KotItemSchema],
    status: { type: String, enum: ["queued", "preparing", "ready", "served"], default: "queued" },
    priority: { type: String, enum: ["normal", "rush"], default: "normal" },
  },
  { timestamps: true }
);

KotTicketSchema.index({ organizationId: 1, branchId: 1, status: 1, createdAt: -1 });

export const KotTicket: Model<IKotTicket> =
  mongoose.models.KotTicket || mongoose.model<IKotTicket>("KotTicket", KotTicketSchema);
