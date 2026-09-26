import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db/mongoose";
import { JournalEntry } from "@/models/JournalEntry";
import { getSession } from "@/lib/auth/session";
import { requireAccountingPlan } from "@/lib/middleware/requireAccountingPlan";

// GET: General ledger journal entries for the session organization (accounting plans only)
export async function GET(req: Request) {
  try {
    await dbConnect();
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.role !== "admin" && session.role !== "manager") {
      return NextResponse.json({ error: "Forbidden — Manager or Admin required" }, { status: 403 });
    }

    const guard = await requireAccountingPlan(session.organizationId);
    if (!guard.allowed) return guard.response!;

    const { searchParams } = new URL(req.url);
    const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 200, 1), 1000);

    const entries = await JournalEntry.find({
      organizationId: session.organizationId,
      archivedAt: { $exists: false },
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    // Account balances over the visible (non-archived) period
    const balances = await JournalEntry.aggregate([
      { $match: { organizationId: guard.org!._id, archivedAt: { $exists: false } } },
      { $unwind: "$lines" },
      {
        $group: {
          _id: { code: "$lines.accountCode", name: "$lines.accountName" },
          debit: { $sum: { $cond: [{ $eq: ["$lines.type", "debit"] }, "$lines.amount", 0] } },
          credit: { $sum: { $cond: [{ $eq: ["$lines.type", "credit"] }, "$lines.amount", 0] } },
        },
      },
      { $sort: { "_id.code": 1 } },
    ]);

    return NextResponse.json({
      success: true,
      entries,
      balances: balances.map((b) => ({ accountCode: b._id.code, accountName: b._id.name, debit: b.debit, credit: b.credit })),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: process.env.NODE_ENV === "production" ? "Failed to load ledger" : error.message },
      { status: 500 }
    );
  }
}
