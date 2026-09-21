import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db/mongoose";
import { runDataRetentionJob } from "@/lib/jobs/enforceDataRetention";
import { getSession } from "@/lib/auth/session";

export async function POST(req: Request) {
  try {
    await dbConnect();
    const session = await getSession();

    // Verify request originates from Super Admin or valid Cron secret header
    const cronSecret = req.headers.get("x-cron-secret");
    const isCronAuthorized = process.env.CRON_SECRET && cronSecret === process.env.CRON_SECRET;
    const isSuperAdmin = session?.role === "super_admin";

    if (!isSuperAdmin && !isCronAuthorized) {
      return NextResponse.json({ error: "Forbidden — Unauthorized trigger" }, { status: 403 });
    }

    const summaries = await runDataRetentionJob();

    return NextResponse.json({
      success: true,
      message: "Data retention archiving job executed successfully!",
      summaries,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: process.env.NODE_ENV === "production" ? "Failed to execute data retention job" : error.message },
      { status: 500 }
    );
  }
}
