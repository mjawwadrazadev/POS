import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/db/mongoose";
import { User } from "@/models/User";
import { requireSuperAdminAction } from "@/lib/middleware/requireSuperAdminAction";
import { isPinTakenInOrg } from "@/lib/auth/pinUniqueness";
import { logAudit } from "@/lib/audit/logger";
import { getClientIp, isValidPin } from "@/lib/utils/server";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireSuperAdminAction("reset_user_pin");
    if (!auth.authorized) return auth.response;

    const { id: organizationId } = await params;
    await dbConnect();

    const { userId, newPin, newPassword, reason = "User support request" } = await req.json();

    if (!mongoose.isValidObjectId(userId) || !mongoose.isValidObjectId(organizationId) || (!newPin && !newPassword)) {
      return NextResponse.json({ error: "User ID and new PIN or password are required" }, { status: 400 });
    }
    if (newPin && !isValidPin(String(newPin))) {
      return NextResponse.json({ error: "PIN must be exactly 4 digits" }, { status: 400 });
    }
    if (newPassword && String(newPassword).length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    // Platform accounts can never be reset through the tenant support tool
    const targetUser = await User.findOne({
      _id: userId,
      organizationId,
      role: { $in: ["admin", "manager", "cashier"] },
    });
    if (!targetUser) {
      return NextResponse.json({ error: "User not found in specified organization" }, { status: 404 });
    }

    if (newPin && (await isPinTakenInOrg(organizationId, String(newPin), userId))) {
      return NextResponse.json({ error: "This PIN is already used by another staff member of this store" }, { status: 400 });
    }

    const resetDetails: string[] = [];
    if (newPin) {
      targetUser.pin = String(newPin);
      resetDetails.push("PIN reset");
    }
    if (newPassword) {
      targetUser.password = String(newPassword);
      resetDetails.push("Password reset");
    }
    await targetUser.save();

    // Never record the credential values themselves
    await logAudit({
      organizationId: targetUser.organizationId,
      actorId: auth.session!.userId,
      actorName: auth.session!.fullName || auth.session!.name || auth.session!.email,
      actorRole: auth.session!.role,
      action: "SUPER_ADMIN_USER_PIN_RESET",
      targetCollection: "User",
      targetId: targetUser._id as any,
      after: { targetUserEmail: targetUser.email, resetDetails, reason },
      ipAddress: getClientIp(req),
    });

    return NextResponse.json({ success: true, message: `Credentials for '${targetUser.fullName}' reset successfully.` });
  } catch (error: any) {
    return NextResponse.json(
      { error: process.env.NODE_ENV === "production" ? "Failed to reset user credentials" : error.message },
      { status: 500 }
    );
  }
}
