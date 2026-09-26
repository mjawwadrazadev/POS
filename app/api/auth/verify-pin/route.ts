import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db/mongoose";
import { User } from "@/models/User";
import { getSession, signToken } from "@/lib/auth/session";
import { checkRateLimit, recordFailedAttempt, clearRateLimit } from "@/lib/security/rateLimiter";
import { logAudit } from "@/lib/audit/logger";
import { isValidPin } from "@/lib/utils/server";
import { OVERRIDE_TOKEN_PURPOSE, OVERRIDE_TTL_SECONDS } from "@/lib/auth/override";

const WINDOW_MS = 15 * 60 * 1000;

/**
 * POST: Verify a manager/admin PIN *within the current store* without changing the logged-in session.
 * Returns a short-lived signed override token the POS attaches to the order when a discount needs approval.
 */
export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { pin } = await req.json();
    if (!isValidPin(String(pin ?? ""))) {
      return NextResponse.json({ error: "A 4-digit PIN is required" }, { status: 400 });
    }

    const rateKey = `verify_pin:${session.userId}`;
    const rate = await checkRateLimit(rateKey, 5, WINDOW_MS);
    if (!rate.success) {
      return NextResponse.json({ error: "Too many invalid PIN attempts. Try again later." }, { status: 429 });
    }

    await dbConnect();
    const approvers = await User.find({
      organizationId: session.organizationId,
      isActive: true,
      role: { $in: ["admin", "manager"] },
    }).select("+pin");

    let approver = null;
    for (const u of approvers) {
      if (await u.comparePin(String(pin))) {
        approver = u;
        break;
      }
    }

    if (!approver) {
      await recordFailedAttempt(rateKey, WINDOW_MS);
      return NextResponse.json({ error: "Invalid PIN — Manager or Admin PIN required" }, { status: 401 });
    }

    await clearRateLimit(rateKey);

    await logAudit({
      organizationId: session.organizationId,
      actorId: approver._id as any,
      actorName: approver.fullName,
      actorRole: approver.role,
      action: "discount.override_approved",
      targetCollection: "User",
      targetId: session.userId,
      after: { requestedBy: session.fullName || session.email },
    });

    const overrideToken = signToken(
      {
        purpose: OVERRIDE_TOKEN_PURPOSE,
        organizationId: session.organizationId,
        requestedBy: session.userId,
        approverId: (approver._id as any).toString(),
        approverName: approver.fullName,
      },
      OVERRIDE_TTL_SECONDS
    );

    return NextResponse.json({
      success: true,
      approver: { name: approver.fullName, role: approver.role },
      overrideToken,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: process.env.NODE_ENV === "production" ? "Failed to verify PIN" : error.message },
      { status: 500 }
    );
  }
}
