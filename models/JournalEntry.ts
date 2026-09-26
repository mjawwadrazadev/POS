import mongoose, { Schema, Document, Model } from "mongoose";

export interface IJournalLine {
  accountCode: string;
  accountName: string;
  type: "debit" | "credit";
  amount: number;
}

export interface IJournalEntry extends Document {
  organizationId: mongoose.Types.ObjectId;
  branchId: mongoose.Types.ObjectId;
  entryNumber: string;
  referenceId: string; // Order Number or Purchase Order Number
  description: string;
  lines: IJournalLine[];
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
  archivedAt?: Date; // set by the retention job; archived entries are hidden, never deleted
  createdAt: Date;
}

const JournalLineSchema = new Schema({
  accountCode: { type: String, required: true },
  accountName: { type: String, required: true },
  type: { type: String, enum: ["debit", "credit"], required: true },
  amount: { type: Number, required: true, min: 0 },
});

const JournalEntrySchema: Schema<IJournalEntry> = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch", required: true, index: true },
    entryNumber: { type: String, required: true, unique: true },
    referenceId: { type: String, required: true },
    description: { type: String, required: true },
    lines: [JournalLineSchema],
    totalDebit: { type: Number, required: true },
    totalCredit: { type: Number, required: true },
    isBalanced: { type: Boolean, required: true, default: true },
    archivedAt: { type: Date, index: true },
  },
  { timestamps: true }
);

JournalEntrySchema.index({ organizationId: 1, createdAt: -1 });

export const JournalEntry: Model<IJournalEntry> =
  mongoose.models.JournalEntry || mongoose.model<IJournalEntry>("JournalEntry", JournalEntrySchema);
