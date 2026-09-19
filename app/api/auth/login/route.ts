import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db/mongoose";
import { User } from "@/models/User";
import { Branch } from "@/models/Branch";
import { Organization } from "@/models/Organization";
import { signToken, SessionPayload } from "@/lib/auth/session";

export async function POST(req: Request) {
  try {
    await dbConnect();
    const { email, password, pin } = await req.json();

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

    // Get branch details
    let branchName = "Main Branch";
    if (user.branchId) {
      const branch = await Branch.findById(user.branchId);
      if (branch) branchName = `${branch.name} (${branch.code})`;
    }

    // Get Organization details
    let organizationName = "Master Organization";
    let businessType: any = "bakery";
    if (user.organizationId) {
      const org = await Organization.findById(user.organizationId);
      if (org) {
        organizationName = org.name;
        businessType = org.businessType;
      }
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
