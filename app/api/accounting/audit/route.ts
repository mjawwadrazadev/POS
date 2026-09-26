import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/db/mongoose";
import { auditLedgerBalance } from "@/lib/accounting/auditBalance";
import { requireAccountingPlan } from "@/lib/middleware/requireAccountingPlan";
import { getSession } from "@/lib/auth/session";

export async function GET(req: Request) {
  try {
    await dbConnect();
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const isPlatform = (session.role === "super_admin" || session.role === "platform_support") && !session.isImpersonating;
    if (!isPlatform && session.role !== "admin" && session.role !== "manager") {
      return NextResponse.json({ error: "Forbidden — Manager or Admin required" }, { status: 403 });
    }

    // Platform staff may audit any tenant; store users only their own books
    const requestedOrg = new URL(req.url).searchParams.get("organizationId");
    const targetOrgId = isPlatform && requestedOrg && mongoose.isValidObjectId(requestedOrg) ? requestedOrg : session.organizationId;

    const guard = await requireAccountingPlan(targetOrgId);
    if (!guard.allowed) return guard.response!;

    const result = await auditLedgerBalance(targetOrgId);

    return NextResponse.json({
      success: true,
      audit: result,
      statusMessage:
        result.unbalancedCount === 0
          ? "✅ All Journal Entries are 100% Balanced (Debit = Credit)."
          : `⚠️ Flagged ${result.unbalancedCount} unbalanced Journal Entry records!`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: process.env.NODE_ENV === "production" ? "Failed to execute ledger audit" : error.message },
      { status: 500 }
    );
  }
}
