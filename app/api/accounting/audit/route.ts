import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db/mongoose";
import { auditLedgerBalance } from "@/lib/accounting/auditBalance";
import { requireAccountingPlan } from "@/lib/middleware/requireAccountingPlan";
import { getSession } from "@/lib/auth/session";

export async function GET(req: Request) {
  try {
    await dbConnect();
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const targetOrgId = session.role === "super_admin"
      ? (new URL(req.url).searchParams.get("organizationId") || session.organizationId)
      : session.organizationId;

    if (targetOrgId) {
      const guard = await requireAccountingPlan(targetOrgId);
      if (!guard.allowed) {
        return guard.response!;
      }
    }

    const result = await auditLedgerBalance(targetOrgId || undefined);

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
