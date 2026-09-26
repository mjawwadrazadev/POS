import { dbConnect } from "@/lib/db/mongoose";
import { Organization } from "@/models/Organization";
import { Order } from "@/models/Order";
import { User } from "@/models/User";
import { AuditLog } from "@/models/AuditLog";
import { TenantHealthSnapshot } from "@/models/TenantHealthSnapshot";

export async function computeTenantHealthSnapshots() {
  await dbConnect();

  const orgs = await Organization.find({ code: { $ne: "rst-hq" }, subscriptionStatus: { $ne: "terminated" } }).lean();
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const results = [];

  for (const org of orgs) {
    const orders7Days = await Order.countDocuments({
      organizationId: org._id,
      createdAt: { $gte: sevenDaysAgo },
    });

    const orders30Days = await Order.countDocuments({
      organizationId: org._id,
      createdAt: { $gte: thirtyDaysAgo },
    });

    const latestOrder = await Order.findOne({ organizationId: org._id })
      .sort({ createdAt: -1 })
      .select("createdAt")
      .lean();

    const activeStaffCount = await User.countDocuments({
      organizationId: org._id,
      isActive: true,
    });

    const lastLogin = await AuditLog.findOne({ organizationId: org._id, action: "login.success" })
      .sort({ createdAt: -1 })
      .select("createdAt")
      .lean();

    let daysSinceLastSale = 999;
    if (latestOrder && latestOrder.createdAt) {
      const diffMs = now.getTime() - new Date(latestOrder.createdAt).getTime();
      daysSinceLastSale = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    }

    let healthStatus: "active" | "slowing" | "dormant" = "dormant";
    if (daysSinceLastSale <= 3) {
      healthStatus = "active";
    } else if (daysSinceLastSale <= 14) {
      healthStatus = "slowing";
    } else {
      healthStatus = "dormant";
    }

    const snapshot = await TenantHealthSnapshot.findOneAndUpdate(
      { organizationId: org._id },
      {
        organizationId: org._id,
        tenantName: org.name,
        vertical: org.businessType || "bakery",
        snapshotDate: now,
        orders7Days,
        orders30Days,
        activeStaffCount,
        lastLoginAt: lastLogin?.createdAt,
        daysSinceLastSale,
        healthStatus,
      },
      { upsert: true, new: true }
    ).lean();

    results.push(snapshot);
  }

  // Drop snapshots of tenants that were terminated or removed
  await TenantHealthSnapshot.deleteMany({ organizationId: { $nin: orgs.map((o: any) => o._id) } });

  return results;
}
