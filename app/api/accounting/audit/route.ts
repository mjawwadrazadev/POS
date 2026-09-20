import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db/mongoose";
import { auditLedgerBalance } from "@/lib/accounting/auditBalance";
import { requireAccountingPlan } from "@/lib/middleware/requireAccountingPlan";

export async function GET(req: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get("organizationId");

    if (orgId) {
      const guard = await requireAccountingPlan(orgId);
      if (!guard.allowed) {
        return guard.response!;
      }
    }

    const result = await auditLedgerBalance(orgId || undefined);

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
      { error: error.message || "Failed to execute ledger audit" },
      { status: 500 }
    );
  }
}

