import mongoose, { Schema, Document, Model } from "mongoose";

export interface IOrderItem {
  productId: mongoose.Types.ObjectId;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  unitCost?: number; // cost price snapshot at time of sale (for gross profit reporting)
  discount: number;
  total: number;
  batchNumber?: string;
  refundedQuantity: number;
}

export interface IOrder extends Document {
  organizationId: mongoose.Types.ObjectId;
  branchId: mongoose.Types.ObjectId;
  orderNumber: string;
  orderType: "dine_in" | "takeaway" | "delivery" | "retail_sale" | "prescription";
  tableNumber?: string;
  cashierId?: mongoose.Types.ObjectId;
  cashierName: string;
  customerName?: string;
  items: IOrderItem[];
  subtotal: number;
  taxAmount: number;
  discountTotal: number;
  discountGlobalPercent: number;
  discountApprovedBy?: string;
  taxRate: number;
  grandTotal: number;
  paymentMethod: "cash" | "card" | "wallet" | "split";
  payments?: {
    method: "cash" | "card" | "wallet" | "store_credit";
    amount: number;
    reference?: string;
  }[];
  counterSessionId?: mongoose.Types.ObjectId;
  status: "completed" | "held" | "voided" | "partially_refunded" | "refunded";
  journalEntryId?: mongoose.Types.ObjectId;
  clientRef?: string; // idempotency key for offline-queued orders
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
  unitCost: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  total: { type: Number, required: true },
  batchNumber: { type: String },
  refundedQuantity: { type: Number, default: 0, min: 0 },
});

const PaymentDetailSchema = new Schema({
  method: { type: String, enum: ["cash", "card", "wallet", "store_credit"], required: true },
  amount: { type: Number, required: true },
  reference: { type: String },
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
    cashierId: { type: Schema.Types.ObjectId, ref: "User" },
    cashierName: { type: String, required: true, default: "Main Cashier" },
    customerName: { type: String, default: "Walk-in Customer" },
    items: [OrderItemSchema],
    subtotal: { type: Number, required: true },
    taxAmount: { type: Number, default: 0 },
    discountTotal: { type: Number, default: 0 },
    discountGlobalPercent: { type: Number, default: 0, min: 0, max: 100 },
    discountApprovedBy: { type: String },
    taxRate: { type: Number, default: 0 },
    grandTotal: { type: Number, required: true },
    paymentMethod: { type: String, enum: ["cash", "card", "wallet", "split"], default: "cash" },
    payments: [PaymentDetailSchema],
    counterSessionId: { type: Schema.Types.ObjectId, ref: "CounterSession" },
    status: {
      type: String,
      enum: ["completed", "held", "voided", "partially_refunded", "refunded"],
      default: "completed",
    },
    journalEntryId: { type: Schema.Types.ObjectId, ref: "JournalEntry" },
    clientRef: { type: String },
    syncedOffline: { type: Boolean, default: false },
  },
  { timestamps: true }
);

OrderSchema.index({ organizationId: 1, branchId: 1, createdAt: -1 });
OrderSchema.index({ organizationId: 1, orderNumber: 1 }, { unique: true });
OrderSchema.index(
  { organizationId: 1, clientRef: 1 },
  { unique: true, partialFilterExpression: { clientRef: { $type: "string" } } }
);

export const Order: Model<IOrder> =
  mongoose.models.Order || mongoose.model<IOrder>("Order", OrderSchema);
