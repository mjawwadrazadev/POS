import { AuditLog } from "@/models/AuditLog";
import mongoose from "mongoose";

export interface LogAuditParams {
  organizationId: string | mongoose.Types.ObjectId;
  branchId?: string | mongoose.Types.ObjectId;
  actorId: string | mongoose.Types.ObjectId;
  actorName: string;
  actorRole: string;
  action: string;
  targetCollection: string;
  targetId?: string | mongoose.Types.ObjectId;
  before?: any;
  after?: any;
  ipAddress?: string;
}

export async function logAudit(params: LogAuditParams) {
  try {
    await AuditLog.create({
      organizationId: params.organizationId,
      branchId: params.branchId,
      actorId: params.actorId,
      actorName: params.actorName,
      actorRole: params.actorRole,
      action: params.action,
      targetCollection: params.targetCollection,
      targetId: params.targetId,
      before: params.before,
      after: params.after,
      ipAddress: params.ipAddress || "127.0.0.1",
    });
  } catch (error) {
    console.error("Audit logging error:", error);
  }
}
