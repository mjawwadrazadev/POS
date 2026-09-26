import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/db/mongoose";
import { Organization } from "@/models/Organization";
import { PaymentHistory } from "@/models/PaymentHistory";
import { AuditLog } from "@/models/AuditLog";
import { requireSuperAdminAction } from "@/lib/middleware/requireSuperAdminAction";
import { getClientIp } from "@/lib/utils/server";

const PAYMENT_METHODS = ["cash", "bank_transfer", "stripe", "cheque", "manual"];

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

    const amountNum = Number(amount);
    const months = Number(monthsAdded);
    if (!mongoose.isValidObjectId(organizationId) || !Number.isFinite(amountNum) || amountNum <= 0) {
      return NextResponse.json({ error: "Organization ID and a positive amount are required" }, { status: 400 });
    }
    if (!Number.isInteger(months) || months < 1 || months > 36) {
      return NextResponse.json({ error: "Months added must be between 1 and 36" }, { status: 400 });
    }
    if (!PAYMENT_METHODS.includes(paymentMethod)) {
      return NextResponse.json({ error: "Invalid payment method" }, { status: 400 });
    }

    const org = await Organization.findById(organizationId);
    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }
    if (org.subscriptionStatus === "terminated") {
      return NextResponse.json({ error: "Cannot record payments for a terminated tenant" }, { status: 400 });
    }

    const now = new Date();
    // Calculate new expiry: if current expiry is in the future, extend from current expiry; otherwise extend from now
    const currentExpiry = org.expiryDate && new Date(org.expiryDate) > now ? new Date(org.expiryDate) : now;
    const newExpiry = new Date(currentExpiry.getTime() + months * 30 * 24 * 60 * 60 * 1000);

    // 1. Create standalone PaymentHistory record
    const payment = await PaymentHistory.create({
      organizationId: org._id,
      tenantName: org.name,
      amount: amountNum,
      currency: org.currency || "PKR",
      planTier: org.planTier || "billing_accounting",
      billingCycle: org.subscriptionPlan || "monthly",
      monthsAdded: months,
      paymentMethod,
      transactionReference,
      paidAt: now,
      expiresAt: newExpiry,
      notes,
      createdBy: auth.session!.userId,
    });

    // 2. Update Organization subscription status and expiry (PaymentHistory is the payment ledger)
    org.subscriptionStatus = "active";
    org.expiryDate = newExpiry;
    org.lastPaymentDate = now;
    await org.save();

    // 3. Write AuditLog entry
    await AuditLog.create({
      organizationId: org._id,
      actorId: auth.session!.userId,
      actorName: auth.session!.fullName || auth.session!.name || auth.session!.email,
      actorRole: auth.session!.role,
      action: "SUBSCRIPTION_PAYMENT_RECORDED",
      targetCollection: "PaymentHistory",
      targetId: payment._id,
      after: { amount, monthsAdded, newExpiry },
      ipAddress: getClientIp(req),
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
