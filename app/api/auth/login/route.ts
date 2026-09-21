import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db/mongoose";
import { User } from "@/models/User";
import { Branch } from "@/models/Branch";
import { Organization } from "@/models/Organization";
import { signToken, SessionPayload } from "@/lib/auth/session";
import { checkRateLimit } from "@/lib/security/rateLimiter";
import { logAudit } from "@/lib/audit/logger";

export async function POST(req: Request) {
  try {
    await dbConnect();
    const { email, password, pin, isSuperAdminPortal } = await req.json();

    // 1. Rate Limiting — key by email for email logins; by client IP for PIN logins (prevents PIN enumeration)
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || req.headers.get("x-real-ip")
      || "unknown";
    const rateLimitKey = email ? `login:${email.toLowerCase()}` : `pin_ip:${clientIp}`;
    const rateCheck = checkRateLimit(rateLimitKey, 5, 15 * 60 * 1000);

    if (!rateCheck.success) {
      const minsRemaining = Math.ceil((rateCheck.resetTime - Date.now()) / (60 * 1000));
      return NextResponse.json(
        {
          error: `Too many failed login attempts. Account locked for security. Please try again in ${minsRemaining} minute(s).`,
        },
        { status: 429 }
      );
    }

    // 2. Check user by email or pin (explicitly include +password +pin for comparison)
    let user = null;
    if (email) {
      user = await User.findOne({ email: email.toLowerCase() }).select("+password +pin");
    } else if (pin) {
      // Find all users and compare PIN via bcrypt or fallback match
      const activeUsers = await User.find({ isActive: true }).select("+pin +password");
      for (const u of activeUsers) {
        if (await u.comparePin(pin)) {
          user = u;
          break;
        }
      }
    }

    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: "Invalid credentials or inactive user account" },
        { status: 401 }
      );
    }

    // 3. Password / PIN Comparison
    if (email) {
      if (!password && !pin) {
        return NextResponse.json({ error: "Password or PIN is required" }, { status: 400 });
      }

      if (password) {
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
          // Log failed login audit
          await logAudit({
            organizationId: user.organizationId,
            branchId: user.branchId,
            actorId: user._id,
            actorName: user.fullName,
            actorRole: user.role,
            action: "login.failed",
            targetCollection: "User",
            targetId: user._id,
          });

          return NextResponse.json({ error: "Invalid email address or password" }, { status: 401 });
        }
      } else if (pin) {
        const isPinValid = await user.comparePin(pin);
        if (!isPinValid) {
          return NextResponse.json({ error: "Invalid 4-digit PIN" }, { status: 401 });
        }
      }
    }

    // 4. Super Admin Portal restriction check
    if (isSuperAdminPortal && user.role !== "super_admin") {
      return NextResponse.json(
        { error: "Access Denied — This portal is strictly for Super Admin accounts. Regular tenants please log in at /login" },
        { status: 403 }
      );
    }

    // 5. Get Organization & check subscription expiry (Skip check for Super Admin)
    let organizationName = "Master Organization";
    let businessType: any = "bakery";

    if (user.organizationId) {
      const org = await Organization.findById(user.organizationId);
      if (org) {
        organizationName = org.name;
        businessType = org.businessType;

        // Check subscription status for regular tenants
        if (user.role !== "super_admin") {
          const now = new Date();
          const isExpired = org.expiryDate && new Date(org.expiryDate) < now;
          const isSuspended = org.subscriptionStatus === "suspended";

          if (isSuspended || isExpired) {
            // Auto update status if expired
            if (isExpired && org.subscriptionStatus !== "expired") {
              org.subscriptionStatus = "expired";
              await org.save();
            }
            return NextResponse.json(
              {
                error: `Access Blocked — ${org.name}'s subscription has expired. Please contact Super Admin to renew your access fee.`,
                isSubscriptionExpired: true,
              },
              { status: 403 }
            );
          }
        }
      }
    }

    // 6. Get branch details
    let branchName = "Main Branch";
    if (user.branchId) {
      const branch = await Branch.findById(user.branchId);
      if (branch) branchName = `${branch.name} (${branch.code})`;
    }

    const payload: SessionPayload = {
      userId: user._id.toString(),
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId ? user.organizationId.toString() : "",
      organizationName,
      businessType,
      branchId: user.branchId?.toString(),
      branchName,
    };

    const token = signToken(payload);

    // 7. Audit log successful login
    await logAudit({
      organizationId: user.organizationId,
      branchId: user.branchId,
      actorId: user._id,
      actorName: user.fullName,
      actorRole: user.role,
      action: "login.success",
      targetCollection: "User",
      targetId: user._id,
    });

    const response = NextResponse.json({
      success: true,
      user: payload,
    });

    response.cookies.set("rst_pos_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 43200, // 12 hours
      path: "/",
    });

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { error: process.env.NODE_ENV === "production" ? "Internal Server Error" : error.message },
      { status: 500 }
    );
  }
}
