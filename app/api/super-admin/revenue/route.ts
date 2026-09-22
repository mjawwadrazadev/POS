import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db/mongoose";
import { Organization } from "@/models/Organization";
import { PaymentHistory } from "@/models/PaymentHistory";
import { MonthlyRevenueSnapshot } from "@/models/MonthlyRevenueSnapshot";
import { requireSuperAdminAction } from "@/lib/middleware/requireSuperAdminAction";

export async function GET() {
  try {
    const auth = await requireSuperAdminAction("read_analytics");
    if (!auth.authorized) return auth.response;

    await dbConnect();

    // 1. Fetch precomputed revenue snapshot for current month
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    let latestSnapshot = await MonthlyRevenueSnapshot.findOne({ monthKey }).lean();

    // 2. Fetch live org stats to ensure up-to-date calculation
    const orgs = await Organization.find({ code: { $ne: "rst-hq" } }).lean();
    const totalTenants = orgs.length;
    const activeTenants = orgs.filter((o: any) => o.subscriptionStatus === "active" || o.subscriptionStatus === "expiring_soon").length;

    let totalMRR = 0;
    const verticalMap: Record<string, number> = {};
    const planMap: Record<string, number> = {};

    orgs.forEach((org: any) => {
      const fee = Number(org.subscriptionFee || 5000);
      const monthlyEquiv = org.subscriptionPlan === "yearly" ? fee / 12 : fee;
      totalMRR += monthlyEquiv;

      const vert = org.businessType || "bakery";
      verticalMap[vert] = (verticalMap[vert] || 0) + monthlyEquiv;

      const plan = org.planTier || "billing_accounting";
      planMap[plan] = (planMap[plan] || 0) + monthlyEquiv;
    });

    const arpu = activeTenants > 0 ? Math.round(totalMRR / activeTenants) : 0;

    // Fetch payment history logs
    const recentPayments = await PaymentHistory.find({})
      .sort({ paidAt: -1 })
      .limit(50)
      .lean();

    // Calculate total lifetime revenue collected
    const lifetimeRevenueAgg = await PaymentHistory.aggregate([
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const lifetimeRevenue = lifetimeRevenueAgg[0]?.total || 0;

    const revenueByVertical = Object.entries(verticalMap).map(([vertical, amount]) => ({ vertical, amount }));
    const revenueByPlan = Object.entries(planMap).map(([planTier, amount]) => ({ planTier, amount }));

    // Update / upsert snapshot
    await MonthlyRevenueSnapshot.findOneAndUpdate(
      { monthKey },
      {
        monthKey,
        totalMRR,
        totalRevenueCollected: lifetimeRevenue,
        totalTenants,
        activeTenants,
        arpu,
        revenueByVertical,
        revenueByPlan,
        calculatedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({
      success: true,
      data: {
        totalMRR,
        lifetimeRevenue,
        totalTenants,
        activeTenants,
        arpu,
        revenueByVertical,
        revenueByPlan,
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
