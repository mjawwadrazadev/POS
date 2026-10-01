import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/db/mongoose";
import { User } from "@/models/User";
import { requireSuperAdminAction } from "@/lib/middleware/requireSuperAdminAction";
import { ASSIGNABLE_PLATFORM_ROLES, PLATFORM_ROLES } from "@/lib/auth/permissions";
import { logAudit } from "@/lib/audit/logger";
import { generateTempPassword, getClientIp } from "@/lib/utils/server";
import { serializePlatformUser } from "@/lib/demo/serialize";

// PATCH: { fullName?, role?, isActive?, phone?, territory?, commissionRate?, resetPassword?: true }
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSuperAdminAction("manage_platform_users");
  if (!auth.authorized) return auth.response;
  const session = auth.session!;

  try {
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: "Invalid user" }, { status: 400 });

    await dbConnect();
    const user = await User.findOne({ _id: id, role: { $in: PLATFORM_ROLES } });
    if (!user) return NextResponse.json({ error: "Platform user not found" }, { status: 404 });

    // The owner account is only managed by itself (password via Forgot Password)
    if (user.role === "super_admin") {
      return NextResponse.json({ error: "The Super Admin account cannot be changed from here" }, { status: 403 });
    }
    const isSelf = String(user._id) === session.userId;

    const body = await req.json();
    const before = { role: user.role, isActive: user.isActive, commissionRate: user.commissionRate };
    const changes: string[] = [];

    if (body.fullName !== undefined) {
      const name = String(body.fullName).trim();
      if (!name) return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
      user.fullName = name;
      changes.push("name");
    }
    if (body.role !== undefined && body.role !== user.role) {
      if (isSelf) return NextResponse.json({ error: "You cannot change your own role" }, { status: 400 });
      if (!ASSIGNABLE_PLATFORM_ROLES.includes(body.role)) return NextResponse.json({ error: "Invalid role" }, { status: 400 });
      user.role = body.role;
      changes.push("role");
    }
    if (body.isActive !== undefined) {
      if (isSelf && !body.isActive) {
        return NextResponse.json({ error: "You cannot deactivate your own account" }, { status: 400 });
      }
      user.isActive = !!body.isActive;
      changes.push(body.isActive ? "activated" : "deactivated");
    }
    if (body.phone !== undefined) user.phone = String(body.phone).trim();
    if (body.territory !== undefined) user.territory = String(body.territory).trim();
    if (body.commissionRate !== undefined) {
      if (body.commissionRate === "" || body.commissionRate === null) {
        user.commissionRate = undefined;
      } else {
        const rate = Number(body.commissionRate);
        if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
          return NextResponse.json({ error: "Commission must be between 0 and 100%" }, { status: 400 });
        }
        user.commissionRate = rate;
      }
      changes.push("commission");
    }

    let tempPassword: string | undefined;
    if (body.resetPassword) {
      tempPassword = generateTempPassword();
      user.password = tempPassword;
      changes.push("password");
    }

    // A role or active-state change ends the user's current session on their next request
    await user.save();

    await logAudit({
      organizationId: session.organizationId,
      actorId: session.userId,
      actorName: session.fullName || session.email,
      actorRole: session.role,
      action: "PLATFORM_USER_UPDATED",
      targetCollection: "User",
      targetId: user._id as any,
      before,
      after: { role: user.role, isActive: user.isActive, commissionRate: user.commissionRate, changes },
      ipAddress: getClientIp(req),
    });

    return NextResponse.json({ success: true, user: serializePlatformUser(user), tempPassword });
  } catch (error: any) {
    return NextResponse.json(
      { error: process.env.NODE_ENV === "production" ? "Failed to update user" : error.message },
      { status: 500 }
    );
  }
}
