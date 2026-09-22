import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db/mongoose";
import { Organization } from "@/models/Organization";
import { Order } from "@/models/Order";
import { User } from "@/models/User";
import { TenantHealthSnapshot } from "@/models/TenantHealthSnapshot";
import { requireSuperAdminAction } from "@/lib/middleware/requireSuperAdminAction";

export async function GET() {
  try {
    const auth = await requireSuperAdminAction("read_analytics");
    if (!auth.authorized) return auth.response;

    await dbConnect();

    const orgs = await Organization.find({ code: { $ne: "rst-hq" } }).lean();
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const healthSnapshots = await Promise.all(
      orgs.map(async (org: any) => {
        // Fetch order stats for tenant
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

        const adminUser = await User.findOne({ organizationId: org._id, role: "admin" })
          .select("updatedAt")
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

        // Upsert TenantHealthSnapshot
        await TenantHealthSnapshot.findOneAndUpdate(
          { organizationId: org._id },
          {
            organizationId: org._id,
            tenantName: org.name,
            vertical: org.businessType || "bakery",
            snapshotDate: now,
            orders7Days,
            orders30Days,
            activeStaffCount,
            lastLoginAt: adminUser?.updatedAt || org.updatedAt,
            daysSinceLastSale,
            healthStatus,
          },
          { upsert: true, new: true }
        );

        return {
          organizationId: org._id.toString(),
          tenantName: org.name,
          vertical: org.businessType || "bakery",
          orders7Days,
          orders30Days,
          activeStaffCount,
          daysSinceLastSale,
          healthStatus,
          lastLoginAt: adminUser?.updatedAt || org.updatedAt,
        };
      })
    );

    const activeCount = healthSnapshots.filter((h) => h.healthStatus === "active").length;
    const slowingCount = healthSnapshots.filter((h) => h.healthStatus === "slowing").length;
    const dormantCount = healthSnapshots.filter((h) => h.healthStatus === "dormant").length;

    return NextResponse.json({
      success: true,
      data: {
        healthSnapshots,
        summary: {
          activeCount,
          slowingCount,
          dormantCount,
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: process.env.NODE_ENV === "production" ? "Failed to load tenant health stats" : error.message },
      { status: 500 }
    );
  }
}
