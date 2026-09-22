import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db/mongoose";
import { TenantHealthSnapshot } from "@/models/TenantHealthSnapshot";
import { computeTenantHealthSnapshots } from "@/lib/jobs/computeTenantHealthSnapshots";
import { requireSuperAdminAction } from "@/lib/middleware/requireSuperAdminAction";

export async function GET() {
  try {
    const auth = await requireSuperAdminAction("read_analytics");
    if (!auth.authorized) return auth.response;

    await dbConnect();

    // Fetch precomputed health snapshots
    let healthSnapshots = await TenantHealthSnapshot.find({}).lean();

    // If snapshots are empty or missing, run precomputation helper once
    if (healthSnapshots.length === 0) {
      healthSnapshots = await computeTenantHealthSnapshots();
    }

    const activeCount = healthSnapshots.filter((h: any) => h.healthStatus === "active").length;
    const slowingCount = healthSnapshots.filter((h: any) => h.healthStatus === "slowing").length;
    const dormantCount = healthSnapshots.filter((h: any) => h.healthStatus === "dormant").length;

    return NextResponse.json({
      success: true,
      data: {
        healthSnapshots: healthSnapshots.map((h: any) => ({
          organizationId: h.organizationId.toString(),
          tenantName: h.tenantName,
          vertical: h.vertical,
          orders7Days: h.orders7Days,
          orders30Days: h.orders30Days,
          activeStaffCount: h.activeStaffCount,
          daysSinceLastSale: h.daysSinceLastSale,
          healthStatus: h.healthStatus,
          lastLoginAt: h.lastLoginAt,
        })),
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
