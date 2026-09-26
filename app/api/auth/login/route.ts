import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db/mongoose";
import { User, IUser } from "@/models/User";
import { Branch } from "@/models/Branch";
import { Organization } from "@/models/Organization";
import { signToken, setSessionCookie, SessionPayload, isPlatformRole, isBlockedTenantStatus } from "@/lib/auth/session";
import { checkRateLimit, recordFailedAttempt, clearRateLimit } from "@/lib/security/rateLimiter";
import { logAudit } from "@/lib/audit/logger";
import { getClientIp, isValidPin } from "@/lib/utils/server";

const WINDOW_MS = 15 * 60 * 1000;

function tooMany(resetTime: number) {
  const minsRemaining = Math.max(1, Math.ceil((resetTime - Date.now()) / (60 * 1000)));
  return NextResponse.json(
    { error: `Too many failed login attempts. Please try again in ${minsRemaining} minute(s).` },
    { status: 429 }
  );
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const { email, password, pin, orgCode, isSuperAdminPortal } = await req.json();
    const clientIp = getClientIp(req);

    let user: IUser | null = null;
    let failureKeys: string[] = [];

    if (email) {
      // ─── Email + password login ───
      if (!password) {
        return NextResponse.json({ error: "Password is required" }, { status: 400 });
      }

      const normalizedEmail = String(email).toLowerCase().trim();
      failureKeys = [`login:${normalizedEmail}`, `login_ip:${clientIp}`];

      const [byEmail, byIp] = await Promise.all([
        checkRateLimit(failureKeys[0], 5, WINDOW_MS),
        checkRateLimit(failureKeys[1], 50, WINDOW_MS),
      ]);
      if (!byEmail.success) return tooMany(byEmail.resetTime);
      if (!byIp.success) return tooMany(byIp.resetTime);

      const candidate = await User.findOne({ email: normalizedEmail }).select("+password");
      const passwordOk = candidate ? await candidate.comparePassword(String(password)) : false;

      if (!candidate || !passwordOk || !candidate.isActive) {
        await Promise.all(failureKeys.map((k) => recordFailedAttempt(k, WINDOW_MS)));
        if (candidate) {
          await logAudit({
            organizationId: candidate.organizationId,
            branchId: candidate.branchId,
            actorId: candidate._id as any,
            actorName: candidate.fullName,
            actorRole: candidate.role,
            action: "login.failed",
            targetCollection: "User",
            targetId: candidate._id as any,
            ipAddress: clientIp,
          });
        }
        return NextResponse.json({ error: "Invalid email address or password" }, { status: 401 });
      }
      user = candidate;
    } else if (pin) {
      // ─── Store code + PIN login (terminal quick login) ───
      // A PIN is only 4 digits, so it is always scoped to one store and never grants platform access.
      if (isSuperAdminPortal) {
        return NextResponse.json({ error: "PIN login is not available on the platform portal" }, { status: 400 });
      }
      if (!orgCode || !isValidPin(String(pin))) {
        return NextResponse.json({ error: "Store code and a 4-digit PIN are required" }, { status: 400 });
      }

      const normalizedCode = String(orgCode).toLowerCase().trim();
      failureKeys = [`pin:${normalizedCode}:${clientIp}`, `pin_org:${normalizedCode}`];

      const [byTerminal, byOrg] = await Promise.all([
        checkRateLimit(failureKeys[0], 5, WINDOW_MS),
        checkRateLimit(failureKeys[1], 25, WINDOW_MS),
      ]);
      if (!byTerminal.success) return tooMany(byTerminal.resetTime);
      if (!byOrg.success) return tooMany(byOrg.resetTime);

      const org = await Organization.findOne({ code: normalizedCode }).select("_id").lean();
      if (org) {
        const storeUsers = await User.find({
          organizationId: org._id,
          isActive: true,
          role: { $in: ["admin", "manager", "cashier"] },
        }).select("+pin");

        for (const u of storeUsers) {
          if (await u.comparePin(String(pin))) {
            user = u;
            break;
          }
        }
      }

      if (!user) {
        await Promise.all(failureKeys.map((k) => recordFailedAttempt(k, WINDOW_MS)));
        return NextResponse.json({ error: "Invalid store code or PIN" }, { status: 401 });
      }
    } else {
      return NextResponse.json({ error: "Email/password or store code/PIN is required" }, { status: 400 });
    }

    // Portal separation: platform staff use /super-admin/login, tenants use /login
    if (isSuperAdminPortal && !isPlatformRole(user.role)) {
      return NextResponse.json(
        { error: "Access Denied — This portal is strictly for platform staff. Store users please log in at /login" },
        { status: 403 }
      );
    }

    let organizationName = "";
    let orgCodeValue = "";
    let businessType: any = undefined;
    let planTier: SessionPayload["planTier"];

    const org = await Organization.findById(user.organizationId);
    if (org) {
      organizationName = org.name;
      orgCodeValue = org.code;
      businessType = org.businessType;
      planTier = org.planTier;

      if (!isPlatformRole(user.role)) {
        const isExpired = org.expiryDate && new Date(org.expiryDate) < new Date();
        if (isExpired && org.subscriptionStatus !== "expired" && !isBlockedTenantStatus(org.subscriptionStatus)) {
          org.subscriptionStatus = "expired";
          await org.save();
        }
        if (isExpired || isBlockedTenantStatus(org.subscriptionStatus)) {
          return NextResponse.json(
            {
              error: `Access Blocked — ${org.name}'s subscription is ${org.subscriptionStatus.replace("_", " ")}. Please contact the platform administrator.`,
              isSubscriptionExpired: true,
            },
            { status: 403 }
          );
        }
      }
    } else if (!isPlatformRole(user.role)) {
      return NextResponse.json({ error: "Organization not found for this account" }, { status: 403 });
    }

    let branchName = "";
    if (user.branchId) {
      const branch = await Branch.findOne({ _id: user.branchId, organizationId: user.organizationId });
      if (branch) branchName = `${branch.name} (${branch.code})`;
    }

    const payload: SessionPayload = {
      userId: (user._id as any).toString(),
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId ? user.organizationId.toString() : "",
      organizationName,
      orgCode: orgCodeValue,
      businessType,
      planTier,
      branchId: user.branchId?.toString(),
      branchName,
    };

    await Promise.all(failureKeys.map((k) => clearRateLimit(k)));

    await logAudit({
      organizationId: user.organizationId,
      branchId: user.branchId,
      actorId: user._id as any,
      actorName: user.fullName,
      actorRole: user.role,
      action: "login.success",
      targetCollection: "User",
      targetId: user._id as any,
      ipAddress: clientIp,
    });

    const response = NextResponse.json({ success: true, user: payload });
    setSessionCookie(response, signToken(payload));
    return response;
  } catch (error: any) {
    return NextResponse.json(
      { error: process.env.NODE_ENV === "production" ? "Internal Server Error" : error.message },
      { status: 500 }
    );
  }
}
