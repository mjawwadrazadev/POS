import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db/mongoose";
import { User } from "@/models/User";
import { AuditLog } from "@/models/AuditLog";
import { requireSuperAdminAction } from "@/lib/middleware/requireSuperAdminAction";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireSuperAdminAction("reset_user_pin");
    if (!auth.authorized) return auth.response;

    const { id: organizationId } = await params;
    await dbConnect();

    const body = await req.json();
    const { userId, newPin, newPassword, reason = "User support request" } = body;

    if (!userId || (!newPin && !newPassword)) {
      return NextResponse.json({ error: "User ID and new PIN or password are required" }, { status: 400 });
    }

    const targetUser = await User.findOne({ _id: userId, organizationId });
    if (!targetUser) {
      return NextResponse.json({ error: "User not found in specified organization" }, { status: 404 });
    }

    let resetDetails = [];
    if (newPin) {
      targetUser.pin = newPin;
      resetDetails.push(`PIN updated to '${newPin}'`);
    }

    if (newPassword) {
      targetUser.password = newPassword;
      resetDetails.push(`Password reset`);
    }

    await targetUser.save();

    await AuditLog.create({
      organizationId: targetUser.organizationId,
      userId: auth.session!.userId,
      userName: auth.session!.name || "Super Admin",
      userRole: auth.session!.role,
      action: "SUPER_ADMIN_USER_PIN_RESET",
      details: `Reset credentials for staff user '${targetUser.fullName}' (${targetUser.email}). Changes: ${resetDetails.join(
        ", "
      )}. Reason: ${reason}`,
      ipAddress: "127.0.0.1",
    });

    return NextResponse.json({
      success: true,
      message: `Credentials for '${targetUser.fullName}' reset successfully.`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: process.env.NODE_ENV === "production" ? "Failed to reset user credentials" : error.message },
      { status: 500 }
    );
  }
}
