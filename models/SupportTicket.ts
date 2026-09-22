import mongoose, { Schema, Document, Model } from "mongoose";

export interface ITicketMessage {
  senderRole: "super_admin" | "platform_support" | "admin" | "manager" | "cashier";
  senderName: string;
  senderId: mongoose.Types.ObjectId;
  content: string;
  createdAt: Date;
}

export interface ISupportTicket extends Document {
  ticketNumber: string;
  organizationId: mongoose.Types.ObjectId;
  tenantName: string;
  creatorId: mongoose.Types.ObjectId;
  creatorName: string;
  creatorEmail: string;
  subject: string;
  category: "technical" | "billing" | "feature_request" | "general";
  priority: "low" | "medium" | "high" | "urgent";
  status: "open" | "in_progress" | "resolved" | "closed";
  messages: ITicketMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const TicketMessageSchema = new Schema<ITicketMessage>({
  senderRole: { type: String, required: true },
  senderName: { type: String, required: true },
  senderId: { type: Schema.Types.ObjectId, required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const SupportTicketSchema: Schema<ISupportTicket> = new Schema(
  {
    ticketNumber: { type: String, required: true, unique: true },
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    tenantName: { type: String, required: true },
    creatorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    creatorName: { type: String, required: true },
    creatorEmail: { type: String, required: true },
    subject: { type: String, required: true },
    category: { type: String, enum: ["technical", "billing", "feature_request", "general"], default: "general" },
    priority: { type: String, enum: ["low", "medium", "high", "urgent"], default: "medium" },
    status: { type: String, enum: ["open", "in_progress", "resolved", "closed"], default: "open" },
    messages: [TicketMessageSchema],
  },
  { timestamps: true }
);

export const SupportTicket: Model<ISupportTicket> =
  mongoose.models.SupportTicket || mongoose.model<ISupportTicket>("SupportTicket", SupportTicketSchema);
