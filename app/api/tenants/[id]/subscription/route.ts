import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db/mongoose";
import { Organization } from "@/models/Organization";
import { getSession } from "@/lib/auth/session";

// POST: Record renewal payment & extend access expiry
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const session = await getSession();
    if (!session || session.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden — Super Admin access required" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();

    const { amount, monthsAdded = 1, notes = "Subscription Renewal Payment" } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: "Payment amount must be greater than 0" },
        { status: 400 }
      );
    }

    const org = await Organization.findById(id);
    if (!org) {
      return NextResponse.json({ error: "Tenant organization not found" }, { status: 404 });
    }

    const now = new Date();
    // If current expiry is in the future, extend from current expiry; otherwise extend from now
    const currentExpiry = org.expiryDate && new Date(org.expiryDate) > now ? new Date(org.expiryDate) : now;
    const newExpiry = new Date(currentExpiry.getTime() + Number(monthsAdded) * 30 * 24 * 60 * 60 * 1000);

    org.expiryDate = newExpiry;
    org.lastPaymentDate = now;
    org.subscriptionStatus = "active";
    if (!org.paymentHistory) org.paymentHistory = [];

    org.paymentHistory.push({
      amount: Number(amount),
      paymentDate: now,
      monthsAdded: Number(monthsAdded),
      notes,
    });

    await org.save();

    return NextResponse.json({
      success: true,
      message: `Successfully renewed subscription for ${org.name}! Access extended until ${newExpiry.toLocaleDateString("en-PK")}`,
      expiryDate: newExpiry.toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: process.env.NODE_ENV === "production" ? "Failed to renew subscription" : error.message },
      { status: 500 }
    );
  }
}

// PATCH: Suspend / Unsuspend tenant access
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const session = await getSession();
    if (!session || session.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden — Super Admin access required" }, { status: 403 });
    }

    const { id } = await params;
    const { action } = await req.json();

    const org = await Organization.findById(id);
    if (!org) {
      return NextResponse.json({ error: "Tenant organization not found" }, { status: 404 });
    }

    if (action === "suspend") {
      org.subscriptionStatus = "suspended";
    } else if (action === "unsuspend") {
      org.subscriptionStatus = "active";
      // If expiry was in the past, reset it to +30 days from now
      if (new Date(org.expiryDate) < new Date()) {
        org.expiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      }
    } else {
      return NextResponse.json({ error: "Invalid action. Use 'suspend' or 'unsuspend'" }, { status: 400 });
    }

    await org.save();

    return NextResponse.json({
      success: true,
      message: `Tenant status updated to ${org.subscriptionStatus.toUpperCase()}`,
      status: org.subscriptionStatus,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: process.env.NODE_ENV === "production" ? "Failed to update tenant status" : error.message },
      { status: 500 }
    );
  }
}
