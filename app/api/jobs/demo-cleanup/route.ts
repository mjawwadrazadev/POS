import { NextResponse } from "next/server";
import crypto from "crypto";
import { getSession } from "@/lib/auth/session";
import { getConfigValue } from "@/lib/config/platformConfig";
import { isFullPlatformRole } from "@/lib/auth/permissions";
import { cleanupExpiredDemos } from "@/lib/demo/demoStore";

function isValidCronSecret(provided: string | null): boolean {
  const expected = getConfigValue("cronSecret");
  if (!expected || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// POST: delete every demo store whose 24 hours are over (run hourly from a scheduler).
// The demo screens also run this on load, so demos are cleaned up even without a scheduler.
export async function POST(req: Request) {
  try {
    const isCronAuthorized = isValidCronSecret(req.headers.get("x-cron-secret"));
    const session = isCronAuthorized ? null : await getSession();
    const isAdmin = isFullPlatformRole(session?.role) && !session?.isImpersonating;

    if (!isAdmin && !isCronAuthorized) {
      return NextResponse.json({ error: "Forbidden — Unauthorized trigger" }, { status: 403 });
    }

    const cleaned = await cleanupExpiredDemos();
    return NextResponse.json({ success: true, cleaned });
  } catch (error: any) {
    return NextResponse.json(
      { error: process.env.NODE_ENV === "production" ? "Failed to clean up demos" : error.message },
      { status: 500 }
    );
  }
}
