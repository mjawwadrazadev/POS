import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db/mongoose";
import { User } from "@/models/User";
import { getSession } from "@/lib/auth/session";
import { checkStaffLimit } from "@/lib/middleware/enforcePlanLimits";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await dbConnect();
    const users = await User.find({ organizationId: session.organizationId }).select("-password").lean();
    return NextResponse.json({ success: true, users });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch staff users" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "admin" && session.role !== "super_admin")) {
      return NextResponse.json({ error: "Forbidden — Admin access required to add staff users" }, { status: 403 });
    }

    await dbConnect();

    // 🔒 Enforce Plan Limits Guard
    const limitCheck = await checkStaffLimit(session.organizationId);
    if (!limitCheck.allowed) {
      return NextResponse.json({ error: limitCheck.message }, { status: 403 });
    }

    const body = await req.json();
    const { fullName, email, password, pin = "1234", role = "cashier", branchId } = body;

    if (!fullName || !email) {
      return NextResponse.json({ error: "Full Name and Email are required" }, { status: 400 });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return NextResponse.json({ error: `An account with email '${email}' already exists` }, { status: 400 });
    }

    const user = await User.create({
      organizationId: session.organizationId,
      branchId: branchId || undefined,
      fullName,
      email: email.toLowerCase(),
      password: password || "Password123!",
      pin,
      role,
      isActive: true,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user._id.toString(),
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: process.env.NODE_ENV === "production" ? "Failed to create staff user" : error.message },
      { status: 500 }
    );
  }
}
