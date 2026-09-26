import { NextResponse } from "next/server";
import crypto from "crypto";
import { runDataRetentionJob } from "@/lib/jobs/enforceDataRetention";
import { getSession } from "@/lib/auth/session";
import { getConfigValue } from "@/lib/config/platformConfig";

function isValidCronSecret(provided: string | null): boolean {
  const expected = getConfigValue("cronSecret");
  if (!expected || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  try {
    // Authorized by the cron secret header, or by a logged-in super admin
    const isCronAuthorized = isValidCronSecret(req.headers.get("x-cron-secret"));
    const session = isCronAuthorized ? null : await getSession();
    const isSuperAdmin = session?.role === "super_admin" && !session.isImpersonating;

    if (!isSuperAdmin && !isCronAuthorized) {
      return NextResponse.json({ error: "Forbidden — Unauthorized trigger" }, { status: 403 });
    }

    const summaries = await runDataRetentionJob(
      session ? { userId: session.userId, name: session.fullName || session.email, role: session.role } : undefined
    );

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
