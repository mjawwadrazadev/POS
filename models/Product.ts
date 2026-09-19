import mongoose, { Schema, Document, Model } from "mongoose";

export interface IProduct extends Document {
  organizationId: mongoose.Types.ObjectId;
  name: string;
  sku: string;
  barcode?: string;
  category: string;
  price: number;
  costPrice: number;
  stock: number;
  unit: string;
  // Vertical specific metadata
  batchNumber?: string;
  expiryDate?: Date;
  genericName?: string;
  serialNumber?: string;
  warrantyMonths?: number;
  size?: string;
  color?: string;
  preparationTime?: number; // restaurant
  // Bakery specific fields
  bakedDate?: Date;
  expiryTime?: string; // e.g. "24 Hours" or "2 Days"
  weightGrams?: number;
  flavour?: string;
  isPerishable?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema: Schema<IProduct> = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    name: { type: String, required: true, trim: true },
    sku: { type: String, required: true, uppercase: true, trim: true },
    barcode: { type: String, trim: true },
    category: { type: String, default: "General" },
    price: { type: Number, required: true, min: 0 },
    costPrice: { type: Number, default: 0, min: 0 },
    stock: { type: Number, default: 0 },
    unit: { type: String, default: "Pcs" },
    // Vertical extensions
    batchNumber: { type: String },
    expiryDate: { type: Date },
    genericName: { type: String },
    serialNumber: { type: String },
    warrantyMonths: { type: Number },
    size: { type: String },
    color: { type: String },
    preparationTime: { type: Number },
    // Bakery extensions
    bakedDate: { type: Date },
    expiryTime: { type: String },
    weightGrams: { type: Number },
    flavour: { type: String },
    isPerishable: { type: Boolean, default: false },
  },
  { timestamps: true }
);

ProductSchema.index({ organizationId: 1, sku: 1 }, { unique: true });
ProductSchema.index({ organizationId: 1, barcode: 1 });
ProductSchema.index({ name: "text", sku: "text", barcode: "text" });

export const Product: Model<IProduct> =
  mongoose.models.Product || mongoose.model<IProduct>("Product", ProductSchema);
