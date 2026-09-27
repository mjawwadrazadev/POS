import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/db/mongoose";
import { getSession } from "@/lib/auth/session";
import { User } from "@/models/User";
import { StaffResetRequest } from "@/models/StaffResetRequest";
import { isPinTakenInOrg } from "@/lib/auth/pinUniqueness";
import { logAudit } from "@/lib/audit/logger";
import { getClientIp, isValidPin } from "@/lib/utils/server";
import { sendEmail } from "@/lib/email/resend";
import { appUrl, renderEmail } from "@/lib/email/templates";

/**
 * POST: the store admin answers a staff reset request.
 * Body: { newPassword?, newPin? } to reset, or { dismiss: true } to close it without changes.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.role !== "admin") return NextResponse.json({ error: "Forbidden — Store Admin access required" }, { status: 403 });

    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

    await dbConnect();
    const request = await StaffResetRequest.findOne({ _id: id, organizationId: session.organizationId, status: "pending" });
    if (!request) return NextResponse.json({ error: "Request not found or already handled" }, { status: 404 });

    const { newPassword, newPin, dismiss } = await req.json();
    const actorName = session.fullName || session.email;

    if (dismiss) {
      request.status = "dismissed";
      request.resolvedBy = session.userId as any;
      request.resolvedByName = actorName;
      request.resolvedAt = new Date();
      await request.save();
      return NextResponse.json({ success: true, message: "Request dismissed" });
    }

    if (!newPassword && !newPin) {
      return NextResponse.json({ error: "Enter a new password, a new PIN, or both" }, { status: 400 });
    }
    if (newPassword && String(newPassword).length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }
    if (newPin && !isValidPin(String(newPin))) {
      return NextResponse.json({ error: "PIN must be exactly 4 digits" }, { status: 400 });
    }

    // Only staff of this store; an admin's own account is reset through the emailed link
    const user = await User.findOne({
      _id: request.userId,
      organizationId: session.organizationId,
      role: { $in: ["manager", "cashier"] },
    });
    if (!user) return NextResponse.json({ error: "Staff member not found" }, { status: 404 });

    if (newPin && (await isPinTakenInOrg(session.organizationId, String(newPin), String(user._id)))) {
      return NextResponse.json({ error: "This PIN is already used by another staff member" }, { status: 400 });
    }

    if (newPassword) user.password = String(newPassword);
    if (newPin) user.pin = String(newPin);
    await user.save();

    request.status = "resolved";
    request.resolvedBy = session.userId as any;
    request.resolvedByName = actorName;
    request.resolvedAt = new Date();
    await request.save();

    const changed = [newPassword && "password", newPin && "PIN"].filter(Boolean).join(" and ");

    // Never record the credential values themselves
    await logAudit({
      organizationId: session.organizationId,
      actorId: session.userId,
      actorName,
      actorRole: session.role,
      action: "user.credentials_reset",
      targetCollection: "User",
      targetId: user._id as any,
      after: { targetUserEmail: user.email, changed, viaRequest: String(request._id) },
      ipAddress: getClientIp(req),
    });

    // Tell the employee it's done — the new credentials themselves are handed over in person
    await sendEmail({
      to: user.email,
      subject: "Your RST POS login was reset",
      html: renderEmail({
        heading: "Your login was reset",
        greeting: `Hello ${user.fullName},`,
        blocks: [
          { type: "text", text: `${actorName} has reset your ${changed}. Ask them for the new details, then sign in.` },
          { type: "button", label: "GO TO LOGIN", href: appUrl("/login") },
        ],
      }),
    });

    return NextResponse.json({ success: true, message: `${user.fullName}'s ${changed} reset` });
  } catch (error: any) {
    return NextResponse.json(
      { error: process.env.NODE_ENV === "production" ? "Failed to reset credentials" : error.message },
      { status: 500 }
    );
  }
}
