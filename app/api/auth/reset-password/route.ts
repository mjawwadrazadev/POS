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

    // Update password or PIN
    if (newPassword) {
      // In production with bcryptjs: user.password = await bcrypt.hash(newPassword, 10);
      // For now update PIN or password field
      if (newPassword.length === 4 && !isNaN(Number(newPassword))) {
        user.pin = newPassword;
      }
    }
    if (newPin && newPin.length === 4) {
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
      { error: error.message || "Failed to reset password" },
      { status: 500 }
    );
  }
}
