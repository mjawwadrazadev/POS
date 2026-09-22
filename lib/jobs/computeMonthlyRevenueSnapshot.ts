import { dbConnect } from "@/lib/db/mongoose";
import { Organization } from "@/models/Organization";
import { PaymentHistory } from "@/models/PaymentHistory";
import { MonthlyRevenueSnapshot } from "@/models/MonthlyRevenueSnapshot";

export async function computeMonthlyRevenueSnapshot() {
  await dbConnect();

  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

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

  const lifetimeRevenueAgg = await PaymentHistory.aggregate([
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);
  const lifetimeRevenue = lifetimeRevenueAgg[0]?.total || 0;

  const revenueByVertical = Object.entries(verticalMap).map(([vertical, amount]) => ({ vertical, amount }));
  const revenueByPlan = Object.entries(planMap).map(([planTier, amount]) => ({ planTier, amount }));

  const snapshot = await MonthlyRevenueSnapshot.findOneAndUpdate(
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
      calculatedAt: now,
    },
    { upsert: true, new: true }
  ).lean();

  return snapshot;
}
