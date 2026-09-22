import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db/mongoose";
import { MonthlyRevenueSnapshot } from "@/models/MonthlyRevenueSnapshot";
import { PaymentHistory } from "@/models/PaymentHistory";
import { computeMonthlyRevenueSnapshot } from "@/lib/jobs/computeMonthlyRevenueSnapshot";
import { requireSuperAdminAction } from "@/lib/middleware/requireSuperAdminAction";

export async function GET() {
  try {
    const auth = await requireSuperAdminAction("read_analytics");
    if (!auth.authorized) return auth.response;

    await dbConnect();

    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    // Read directly from precomputed MonthlyRevenueSnapshot collection
    let snapshot = await MonthlyRevenueSnapshot.findOne({ monthKey }).lean();
    if (!snapshot) {
      snapshot = await computeMonthlyRevenueSnapshot();
    }

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
