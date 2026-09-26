import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/db/mongoose";
import { User } from "@/models/User";
import { Branch } from "@/models/Branch";
import { getSession } from "@/lib/auth/session";
import { checkStaffLimit } from "@/lib/middleware/enforcePlanLimits";
import { isPinTakenInOrg } from "@/lib/auth/pinUniqueness";
import { logAudit } from "@/lib/audit/logger";
import { generateTempPassword, isValidPin } from "@/lib/utils/server";

// Store admins may only ever create store-level roles — platform roles are never assignable here
const ASSIGNABLE_ROLES = ["admin", "manager", "cashier"];

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.role !== "admin" && session.role !== "manager") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await dbConnect();
    const users = await User.find({ organizationId: session.organizationId })
      .select("fullName email role isActive branchId baseSalary createdAt")
      .sort({ createdAt: 1 })
      .lean();
    return NextResponse.json({ success: true, users });
  } catch {
    return NextResponse.json({ error: "Failed to fetch staff users" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Forbidden — Store Admin access required to add staff users" }, { status: 403 });
    }

    await dbConnect();

    const limitCheck = await checkStaffLimit(session.organizationId);
    if (!limitCheck.allowed) {
      return NextResponse.json({ error: limitCheck.message }, { status: 403 });
    }

    const { fullName, email, password, pin, role = "cashier", branchId, baseSalary } = await req.json();

    if (!fullName || !email) {
      return NextResponse.json({ error: "Full Name and Email are required" }, { status: 400 });
    }
    if (!ASSIGNABLE_ROLES.includes(role)) {
      return NextResponse.json({ error: `Role must be one of: ${ASSIGNABLE_ROLES.join(", ")}` }, { status: 400 });
    }
    if (!isValidPin(String(pin ?? ""))) {
      return NextResponse.json({ error: "A 4-digit numeric PIN is required" }, { status: 400 });
    }
    if (password && String(password).length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    if (await User.exists({ email: normalizedEmail })) {
      return NextResponse.json({ error: `An account with email '${normalizedEmail}' already exists` }, { status: 400 });
    }
    if (await isPinTakenInOrg(session.organizationId, String(pin))) {
      return NextResponse.json({ error: "This PIN is already used by another staff member. Choose a different PIN." }, { status: 400 });
    }

    let resolvedBranchId: any = undefined;
    if (branchId) {
      if (!mongoose.isValidObjectId(branchId)) return NextResponse.json({ error: "Invalid branch" }, { status: 400 });
      const branch = await Branch.findOne({ _id: branchId, organizationId: session.organizationId });
      if (!branch) return NextResponse.json({ error: "Branch not found in your organization" }, { status: 400 });
      resolvedBranchId = branch._id;
    }

    const salary = baseSalary !== undefined && baseSalary !== "" ? Number(baseSalary) : undefined;
    if (salary !== undefined && (!Number.isFinite(salary) || salary < 0)) {
      return NextResponse.json({ error: "Invalid base salary" }, { status: 400 });
    }

    const tempPassword = password ? undefined : generateTempPassword();

    const user = await User.create({
      organizationId: session.organizationId,
      branchId: resolvedBranchId,
      fullName: String(fullName).trim(),
      email: normalizedEmail,
      password: password || tempPassword,
      pin: String(pin),
      role,
      baseSalary: salary,
      isActive: true,
    });

    await logAudit({
      organizationId: session.organizationId,
      actorId: session.userId,
      actorName: session.fullName || session.email,
      actorRole: session.role,
      action: "user.create",
      targetCollection: "User",
      targetId: user._id as any,
      after: { email: user.email, role: user.role },
    });

    return NextResponse.json({
      success: true,
      user: { id: (user._id as any).toString(), fullName: user.fullName, email: user.email, role: user.role },
      // Shown once so the admin can hand it over; the user should change it via "Forgot Password"
      tempPassword,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: process.env.NODE_ENV === "production" ? "Failed to create staff user" : error.message },
      { status: 500 }
    );
  }
}

// PATCH: Update a staff member (role, active flag, branch, salary, PIN)
export async function PATCH(req: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Forbidden — Store Admin access required" }, { status: 403 });
    }

    await dbConnect();
    const { userId, role, isActive, branchId, baseSalary, pin } = await req.json();

    if (!mongoose.isValidObjectId(userId)) return NextResponse.json({ error: "Invalid user" }, { status: 400 });
    const user = await User.findOne({ _id: userId, organizationId: session.organizationId });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const isSelf = userId === session.userId;
    if (isSelf && (isActive === false || (role && role !== "admin"))) {
      return NextResponse.json({ error: "You cannot deactivate or demote your own account" }, { status: 400 });
    }

    const before = { role: user.role, isActive: user.isActive };

    if (role !== undefined) {
      if (!ASSIGNABLE_ROLES.includes(role)) return NextResponse.json({ error: "Invalid role" }, { status: 400 });
      user.role = role;
    }
    if (isActive !== undefined) {
      if (isActive && !user.isActive) {
        const limitCheck = await checkStaffLimit(session.organizationId);
        if (!limitCheck.allowed) return NextResponse.json({ error: limitCheck.message }, { status: 403 });
      }
      user.isActive = !!isActive;
    }
    if (branchId !== undefined) {
      if (branchId) {
        const branch = await Branch.findOne({ _id: branchId, organizationId: session.organizationId });
        if (!branch) return NextResponse.json({ error: "Branch not found in your organization" }, { status: 400 });
        user.branchId = branch._id as any;
      } else {
        user.branchId = undefined;
      }
    }
    if (baseSalary !== undefined) {
      const salary = Number(baseSalary);
      if (!Number.isFinite(salary) || salary < 0) return NextResponse.json({ error: "Invalid base salary" }, { status: 400 });
      user.baseSalary = salary;
    }
    if (pin !== undefined) {
      if (!isValidPin(String(pin))) return NextResponse.json({ error: "PIN must be 4 digits" }, { status: 400 });
      if (await isPinTakenInOrg(session.organizationId, String(pin), userId)) {
        return NextResponse.json({ error: "This PIN is already used by another staff member" }, { status: 400 });
      }
      user.pin = String(pin);
    }

    await user.save();

    await logAudit({
      organizationId: session.organizationId,
      actorId: session.userId,
      actorName: session.fullName || session.email,
      actorRole: session.role,
      action: "user.update",
      targetCollection: "User",
      targetId: user._id as any,
      before,
      after: { role: user.role, isActive: user.isActive, pinChanged: pin !== undefined },
    });

    return NextResponse.json({ success: true, message: `${user.fullName} updated` });
  } catch (error: any) {
    return NextResponse.json(
      { error: process.env.NODE_ENV === "production" ? "Failed to update staff user" : error.message },
      { status: 500 }
    );
  }
}
