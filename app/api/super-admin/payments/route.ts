import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db/mongoose";
import { Organization } from "@/models/Organization";
import { PaymentHistory } from "@/models/PaymentHistory";
import { AuditLog } from "@/models/AuditLog";
import { requireSuperAdminAction } from "@/lib/middleware/requireSuperAdminAction";

export async function POST(req: Request) {
  try {
    const auth = await requireSuperAdminAction("record_payment");
    if (!auth.authorized) return auth.response;

    await dbConnect();
    const body = await req.json();

    const {
      organizationId,
      amount,
      monthsAdded = 1,
      paymentMethod = "cash",
      transactionReference = "",
      notes = "",
    } = body;

    if (!organizationId || !amount) {
      return NextResponse.json({ error: "Organization ID and Amount are required" }, { status: 400 });
    }

    const org = await Organization.findById(organizationId);
    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const now = new Date();
    // Calculate new expiry: if current expiry is in the future, extend from current expiry; otherwise extend from now
    const currentExpiry = org.expiryDate && new Date(org.expiryDate) > now ? new Date(org.expiryDate) : now;
    const newExpiry = new Date(currentExpiry.getTime() + Number(monthsAdded) * 30 * 24 * 60 * 60 * 1000);

    // 1. Create standalone PaymentHistory record
    const payment = await PaymentHistory.create({
      organizationId: org._id,
      tenantName: org.name,
      amount: Number(amount),
      currency: org.currency || "PKR",
      planTier: org.planTier || "billing_accounting",
      billingCycle: org.subscriptionPlan || "monthly",
      monthsAdded: Number(monthsAdded),
      paymentMethod,
      transactionReference,
      paidAt: now,
      expiresAt: newExpiry,
      notes,
      createdBy: auth.session!.userId,
    });

    // 2. Update Organization subscription status and expiry
    org.subscriptionStatus = "active";
    org.expiryDate = newExpiry;
    org.lastPaymentDate = now;

    // Deprecate subdocument array by syncing latest entry for backwards compatibility
    org.paymentHistory.push({
      amount: Number(amount),
      paymentDate: now,
      monthsAdded: Number(monthsAdded),
      notes: notes || `Recorded ${paymentMethod} payment`,
    });

    await org.save();

    // 3. Write AuditLog entry
    await AuditLog.create({
      organizationId: org._id,
      userId: auth.session!.userId,
      userName: auth.session!.name || "Super Admin",
      userRole: auth.session!.role,
      action: "SUBSCRIPTION_PAYMENT_RECORDED",
      details: `Recorded subscription payment of PKR ${amount} (${monthsAdded} months). New expiry: ${newExpiry.toISOString()}`,
      ipAddress: "127.0.0.1",
    });

    return NextResponse.json({
      success: true,
      message: `Payment of PKR ${amount} logged successfully. Subscription extended until ${newExpiry.toLocaleDateString()}.`,
      paymentId: payment._id.toString(),
      newExpiry: newExpiry.toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: process.env.NODE_ENV === "production" ? "Failed to record payment" : error.message },
      { status: 500 }
    );
  }
}
