import crypto from "crypto";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/db/mongoose";
import { BusinessType, VERTICAL_CONFIGS } from "@/lib/config/verticals";
import { TENANT_TEMPLATE_ITEMS, HOSPITAL_TEMPLATE_DOCTORS } from "@/lib/config/tenantTemplates";
import { generateTempPassword } from "@/lib/utils/server";
import { Organization } from "@/models/Organization";
import { Branch } from "@/models/Branch";
import { User } from "@/models/User";
import { Product } from "@/models/Product";
import { Doctor } from "@/models/Doctor";
import { Table } from "@/models/Table";
import { Order } from "@/models/Order";
import { Attendance } from "@/models/Attendance";
import { AuditLog } from "@/models/AuditLog";
import { Batch } from "@/models/Batch";
import { ConsultationBill } from "@/models/ConsultationBill";
import { CounterSession } from "@/models/CounterSession";
import { JournalEntry } from "@/models/JournalEntry";
import { KotTicket } from "@/models/KotTicket";
import { PaymentHistory } from "@/models/PaymentHistory";
import { PayrollRun } from "@/models/PayrollRun";
import { Refund } from "@/models/Refund";
import { StaffResetRequest } from "@/models/StaffResetRequest";
import { StockTransfer } from "@/models/StockTransfer";
import { SupportTicket } from "@/models/SupportTicket";
import { TenantHealthSnapshot } from "@/models/TenantHealthSnapshot";
import { ImpersonationSession } from "@/models/ImpersonationSession";
import { PasswordResetToken } from "@/models/PasswordResetToken";
import { DemoSession, IDemoSession } from "@/models/DemoSession";

export const DEMO_DURATION_MS = 24 * 60 * 60 * 1000;
// An agent cannot keep more than this many demo stores running at once
export const MAX_ACTIVE_DEMOS_PER_AGENT = 5;
// Demo catalogue starts with stock so the agent can ring up sales straight away
const DEMO_STOCK = 100;

// Every collection that holds a store's data, keyed by organizationId
const ORG_SCOPED_MODELS: mongoose.Model<any>[] = [
  Attendance,
  AuditLog,
  Batch,
  Branch,
  ConsultationBill,
  CounterSession,
  Doctor,
  JournalEntry,
  KotTicket,
  Order,
  PaymentHistory,
  PayrollRun,
  Product,
  Refund,
  StaffResetRequest,
  StockTransfer,
  SupportTicket,
  Table,
  TenantHealthSnapshot,
];

export interface DemoClientInput {
  businessType: BusinessType;
  clientName: string;
  clientBusinessName: string;
  clientPhone?: string;
  clientCity?: string;
  notes?: string;
}

/** Deletes a demo store and everything in it. Safe to call more than once. */
async function deleteDemoOrganization(organizationId: mongoose.Types.ObjectId | string) {
  const org = await Organization.findById(organizationId).select("isDemo").lean();
  // Never wipe a real customer, whatever the demo record says
  if (org && !org.isDemo) throw new Error(`Refusing to delete non-demo organization ${organizationId}`);

  const userIds = (await User.find({ organizationId }).select("_id").lean()).map((u) => u._id);
  await Promise.all([
    ...ORG_SCOPED_MODELS.map((m) => m.deleteMany({ organizationId })),
    ImpersonationSession.deleteMany({ targetOrganizationId: organizationId }),
    PasswordResetToken.deleteMany({ userId: { $in: userIds } }),
  ]);
  await User.deleteMany({ organizationId });
  await Organization.deleteOne({ _id: organizationId, isDemo: true });
}

/** Creates a 24-hour demo store for the agent and returns the demo record (with login details). */
export async function createDemoStore(
  agent: { userId: string; name: string },
  input: DemoClientInput
): Promise<IDemoSession> {
  await dbConnect();

  const code = `demo-${crypto.randomBytes(3).toString("hex")}`;
  const email = `${code}@demo.rstpos.local`;
  const password = generateTempPassword();
  const pin = String(crypto.randomInt(1000, 10000));
  const now = new Date();
  const expiresAt = new Date(now.getTime() + DEMO_DURATION_MS);
  const vertical = VERTICAL_CONFIGS[input.businessType];

  let orgId: mongoose.Types.ObjectId | undefined;
  try {
    const org = await Organization.create({
      name: input.clientBusinessName,
      code,
      businessType: input.businessType,
      currency: "PKR",
      taxRate: input.businessType === "pharmacy" ? 5 : 16,
      phone: input.clientPhone,
      address: input.clientCity,
      planTier: "billing_accounting", // show every feature in a demo
      accountingEnabled: true,
      dataRetentionMonths: 0,
      planLimits: { maxBranches: 2, maxStaffUsers: 5 },
      planPriceAtSelection: 0,
      subscriptionPlan: "custom",
      subscriptionFee: 0,
      subscriptionStatus: "active",
      startDate: now,
      // The normal session guard blocks a tenant past its expiry date, so the demo login stops after 24 hours
      expiryDate: expiresAt,
      lastPaymentDate: now,
      isDemo: true,
    });
    orgId = org._id as mongoose.Types.ObjectId;

    const branch = await Branch.create({
      organizationId: orgId,
      name: `${input.clientBusinessName} - Demo Branch`,
      code: "MAIN-01",
      city: input.clientCity || "Main",
      isMain: true,
    });

    await User.create({
      organizationId: orgId,
      branchId: branch._id,
      fullName: `${input.clientName} (Demo)`,
      email,
      password,
      pin,
      role: "admin",
      isActive: true,
    });

    const template = TENANT_TEMPLATE_ITEMS[input.businessType] || [];
    if (template.length > 0) {
      await Product.insertMany(
        template.map((item, idx) => ({
          ...item,
          stock: DEMO_STOCK,
          organizationId: orgId,
          barcode: `890${Date.now().toString().slice(-6)}${String(idx).padStart(2, "0")}`,
        }))
      );
    }
    if (input.businessType === "hospital") {
      await Doctor.insertMany(HOSPITAL_TEMPLATE_DOCTORS.map((d) => ({ ...d, organizationId: orgId, branchId: branch._id })));
    }
    if (vertical?.enabledModules?.includes("tables")) {
      await Table.insertMany(
        [1, 2, 3, 4].map((n) => ({ organizationId: orgId, branchId: branch._id, label: `T-${n}`, capacity: 4 }))
      );
    }

    const demo = await DemoSession.create({
      agentId: agent.userId,
      agentName: agent.name,
      businessType: input.businessType,
      clientName: input.clientName,
      clientBusinessName: input.clientBusinessName,
      clientPhone: input.clientPhone,
      clientCity: input.clientCity,
      notes: input.notes,
      organizationId: orgId,
      storeCode: code,
      demoEmail: email,
      demoPassword: password,
      demoPin: pin,
      status: "active",
      expiresAt,
    });
    return demo; // a freshly created doc still carries the select:false login fields
  } catch (err) {
    if (orgId) await deleteDemoOrganization(orgId).catch(() => {});
    throw err;
  }
}

/** Ends one demo now: records what happened in it, then deletes the demo store and its data. */
export async function endDemo(demo: IDemoSession, reason: "expired" | "ended_by_agent") {
  if (demo.organizationId) {
    const orgId = demo.organizationId;
    const [orders, salesAgg, products] = await Promise.all([
      Order.countDocuments({ organizationId: orgId }),
      Order.aggregate([
        { $match: { organizationId: new mongoose.Types.ObjectId(String(orgId)), status: { $ne: "voided" } } },
        { $group: { _id: null, total: { $sum: "$grandTotal" } } },
      ]),
      Product.countDocuments({ organizationId: orgId }),
    ]);
    await deleteDemoOrganization(orgId);
    demo.activity = { orders, sales: salesAgg[0]?.total || 0, products };
  }

  await DemoSession.updateOne(
    { _id: demo._id },
    {
      $set: { status: "expired", endedAt: new Date(), endedReason: reason, activity: demo.activity },
      $unset: { organizationId: 1, demoPassword: 1, demoPin: 1 },
    }
  );
}

/**
 * Deletes every demo store whose 24 hours are over. Called by the cron job and, as a safety net,
 * whenever the demo or agent screens load — so it works even without a scheduler.
 */
export async function cleanupExpiredDemos(): Promise<number> {
  await dbConnect();
  const due = await DemoSession.find({ status: "active", expiresAt: { $lte: new Date() } }).limit(50);
  let cleaned = 0;
  for (const demo of due) {
    try {
      await endDemo(demo, "expired");
      cleaned++;
    } catch (err) {
      console.error(`[Demo Cleanup] Failed for demo ${demo._id}:`, err);
    }
  }
  return cleaned;
}
