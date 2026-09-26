import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db/mongoose";
import { MonthlyRevenueSnapshot } from "@/models/MonthlyRevenueSnapshot";
import { PaymentHistory } from "@/models/PaymentHistory";
import { computeMonthlyRevenueSnapshot } from "@/lib/jobs/computeMonthlyRevenueSnapshot";
import { requireSuperAdminAction } from "@/lib/middleware/requireSuperAdminAction";

const SNAPSHOT_MAX_AGE_MS = 10 * 60 * 1000;
const TREND_MONTHS = 6;

export async function GET() {
  try {
    const auth = await requireSuperAdminAction("read_analytics");
    if (!auth.authorized) return auth.response;

    await dbConnect();

    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    // Precomputed snapshot, refreshed when older than the cache window so new tenants and payments show up
    let snapshot = await MonthlyRevenueSnapshot.findOne({ monthKey }).lean();
    if (!snapshot || Date.now() - new Date(snapshot.calculatedAt).getTime() > SNAPSHOT_MAX_AGE_MS) {
      snapshot = await computeMonthlyRevenueSnapshot();
    }

    // Subscription payments actually collected per month, for the trend chart (oldest first)
    const trendStart = new Date(now.getFullYear(), now.getMonth() - (TREND_MONTHS - 1), 1);
    const collected = await PaymentHistory.aggregate([
      { $match: { paidAt: { $gte: trendStart } } },
      { $group: { _id: { y: { $year: "$paidAt" }, m: { $month: "$paidAt" } }, amount: { $sum: "$amount" } } },
    ]);
    const monthlyCollections = Array.from({ length: TREND_MONTHS }, (_, i) => {
      const d = new Date(trendStart.getFullYear(), trendStart.getMonth() + i, 1);
      const hit = collected.find((c: any) => c._id.y === d.getFullYear() && c._id.m === d.getMonth() + 1);
      return {
        monthKey: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        label: d.toLocaleString("en-US", { month: "short" }),
        amount: hit?.amount || 0,
      };
    });

    // Fetch recent 50 standalone payment history records
    const recentPayments = await PaymentHistory.find({})
      .sort({ paidAt: -1 })
      .limit(50)
      .lean();

    return NextResponse.json({
      success: true,
      data: {
        monthKey: snapshot?.monthKey,
        totalMRR: snapshot?.totalMRR || 0,
        lifetimeRevenue: snapshot?.totalRevenueCollected || 0,
        totalTenants: snapshot?.totalTenants || 0,
        activeTenants: snapshot?.activeTenants || 0,
        arpu: snapshot?.arpu || 0,
        revenueByVertical: snapshot?.revenueByVertical || [],
        revenueByPlan: snapshot?.revenueByPlan || [],
        monthlyCollections,
        recentPayments: recentPayments.map((p: any) => ({
          id: p._id.toString(),
          tenantName: p.tenantName,
          amount: p.amount,
          planTier: p.planTier,
          billingCycle: p.billingCycle,
          paymentMethod: p.paymentMethod,
          paidAt: p.paidAt,
          expiresAt: p.expiresAt,
          notes: p.notes,
        })),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: process.env.NODE_ENV === "production" ? "Failed to load revenue analytics" : error.message },
      { status: 500 }
    );
  }
}
