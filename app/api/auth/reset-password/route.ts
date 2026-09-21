import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db/mongoose";
import { User } from "@/models/User";
import { PasswordResetToken } from "@/models/PasswordResetToken";

export async function POST(req: Request) {
  try {
    await dbConnect();
    const { token, email, newPassword, newPin } = await req.json();

    if (!token || !email || (!newPassword && !newPin)) {
      return NextResponse.json(
        { error: "Reset token, email, and new password/PIN are required" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Verify reset token
    const tokenDoc = await PasswordResetToken.findOne({
      token,
      email: normalizedEmail,
      used: false,
      expiresAt: { $gt: new Date() },
    });

    if (!tokenDoc) {
      return NextResponse.json(
        { error: "Invalid or expired password reset token. Please request a new reset link." },
        { status: 400 }
      );
    }

    // Find User
    const user = await User.findById(tokenDoc.userId);
    if (!user || !user.isActive) {
      return NextResponse.json({ error: "User account not found or inactive" }, { status: 404 });
    }

    // Update password or PIN (Mongoose pre-save hook will hash password/PIN with bcrypt)
    if (newPassword) {
      if (newPassword.length < 6) {
        return NextResponse.json({ error: "New password must be at least 6 characters long" }, { status: 400 });
      }
      user.password = newPassword;
    }

    if (newPin) {
      if (newPin.length !== 4 || isNaN(Number(newPin))) {
        return NextResponse.json({ error: "PIN must be a 4-digit number" }, { status: 400 });
      }
      user.pin = newPin;
    }

    await user.save();

    // Mark token as used
    tokenDoc.used = true;
    await tokenDoc.save();

    return NextResponse.json({
      success: true,
      message: "Password reset successfully! You can now log in with your new credentials.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: process.env.NODE_ENV === "production" ? "Failed to reset password" : error.message },
      { status: 500 }
    );
  }
}
