import mongoose, { Schema, Document, Model } from "mongoose";

export interface IOrderItem {
  productId: mongoose.Types.ObjectId;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
  batchNumber?: string;
}

export interface IOrder extends Document {
  organizationId: mongoose.Types.ObjectId;
  branchId: mongoose.Types.ObjectId;
  orderNumber: string;
  orderType: "dine_in" | "takeaway" | "delivery" | "retail_sale" | "prescription";
  tableNumber?: string;
  cashierName: string;
  customerName?: string;
  items: IOrderItem[];
  subtotal: number;
  taxAmount: number;
  discountTotal: number;
  grandTotal: number;
  paymentMethod: "cash" | "card" | "wallet" | "split";
  status: "completed" | "held" | "voided" | "refunded";
  syncedOffline: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  productName: { type: String, required: true },
  sku: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  total: { type: Number, required: true },
  batchNumber: { type: String },
});

const OrderSchema: Schema<IOrder> = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch", required: true, index: true },
    orderNumber: { type: String, required: true },
    orderType: {
      type: String,
      enum: ["dine_in", "takeaway", "delivery", "retail_sale", "prescription"],
      default: "retail_sale",
    },
    tableNumber: { type: String },
    cashierName: { type: String, required: true, default: "Main Cashier" },
    customerName: { type: String, default: "Walk-in Customer" },
    items: [OrderItemSchema],
    subtotal: { type: Number, required: true },
    taxAmount: { type: Number, default: 0 },
    discountTotal: { type: Number, default: 0 },
    grandTotal: { type: Number, required: true },
    paymentMethod: { type: String, enum: ["cash", "card", "wallet", "split"], default: "cash" },
    status: { type: String, enum: ["completed", "held", "voided", "refunded"], default: "completed" },
    syncedOffline: { type: Boolean, default: false },
  },
  { timestamps: true }
);

OrderSchema.index({ organizationId: 1, branchId: 1, createdAt: -1 });

export const Order: Model<IOrder> =
  mongoose.models.Order || mongoose.model<IOrder>("Order", OrderSchema);
