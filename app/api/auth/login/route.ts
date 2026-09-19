import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db/mongoose";
import { User } from "@/models/User";
import { Branch } from "@/models/Branch";
import { Organization } from "@/models/Organization";
import { signToken, SessionPayload } from "@/lib/auth/session";

export async function POST(req: Request) {
  try {
    await dbConnect();
    const { email, password, pin, isSuperAdminPortal } = await req.json();

    // Check user by email or pin
    let user = null;
    if (email) {
      user = await User.findOne({ email: email.toLowerCase() });
    } else if (pin) {
      user = await User.findOne({ pin });
    }

    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: "Invalid credentials or inactive user account" },
        { status: 401 }
      );
    }

    // Super Admin Portal restriction check
    if (isSuperAdminPortal && user.role !== "super_admin") {
      return NextResponse.json(
        { error: "Access Denied — This portal is strictly for Super Admin accounts. Regular tenants please log in at /login" },
        { status: 403 }
      );
    }

    // Get Organization & check subscription expiry (Skip check for Super Admin)
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

    // Get branch details
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
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
