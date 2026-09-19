import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db/mongoose";
import { User } from "@/models/User";
import { PasswordResetToken } from "@/models/PasswordResetToken";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    await dbConnect();
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email address is required" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user || !user.isActive) {
      // Return success to prevent email enumeration attack
      return NextResponse.json({
        success: true,
        message: "If an active account exists for this email, a password reset link has been dispatched.",
      });
    }

    // Generate token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour validity

    // Invalidate any previous unused tokens for this user
    await PasswordResetToken.updateMany({ userId: user._id, used: false }, { used: true });

    // Store new token
    await PasswordResetToken.create({
      userId: user._id,
      email: normalizedEmail,
      token,
      expiresAt,
      used: false,
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const resetUrl = `${appUrl}/reset-password?token=${token}&email=${encodeURIComponent(normalizedEmail)}`;

    // If Resend API Key is configured, send actual email
    const resendApiKey = process.env.RESEND_API_KEY;
    let emailSent = false;

    if (resendApiKey) {
      try {
        const resendRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: process.env.RESEND_FROM_EMAIL || "RST POS Security <onboarding@resend.dev>",
            to: [normalizedEmail],
            subject: "🔑 Reset Your RST POS Account Password",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #141417; color: #ffffff; padding: 30px; border: 1px solid #002bba;">
                <h1 style="color: #819ffe; margin-bottom: 10px;">RST POS</h1>
                <p style="text-transform: uppercase; font-size: 12px; color: #888888; letter-spacing: 2px;">NIB IT Enterprise Platform</p>
                <hr style="border-color: #333333; margin: 20px 0;" />
                <h2 style="color: #ffffff;">Password Reset Request</h2>
                <p style="font-size: 15px; color: #cccccc; line-height: 1.6;">Hello <strong>${user.fullName}</strong>,</p>
                <p style="font-size: 15px; color: #cccccc; line-height: 1.6;">We received a request to reset your password for your RST POS account (${normalizedEmail}). Click the button below to set a new password:</p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${resetUrl}" style="background-color: #002bba; color: #ffffff; text-decoration: none; padding: 14px 28px; font-weight: bold; font-size: 16px; display: inline-block;">RESET MY PASSWORD</a>
                </div>
                <p style="font-size: 13px; color: #888888;">If button doesn't work, copy & paste this link in your browser:<br/><a href="${resetUrl}" style="color: #819ffe;">${resetUrl}</a></p>
                <p style="font-size: 12px; color: #666666; margin-top: 30px;">This link will expire in 1 hour. If you did not request a password reset, please ignore this message.</p>
              </div>
            `,
          }),
        });

        if (resendRes.ok) {
          emailSent = true;
        }
      } catch (emailErr) {
        console.error("Resend API error:", emailErr);
      }
    }

    // Always log to console for local testing/fallback
    console.log("\n========================================================");
    console.log("🔑 RST POS PASSWORD RESET LINK GENERATED:");
    console.log(`User: ${user.fullName} (${normalizedEmail})`);
    console.log(`Reset URL: ${resetUrl}`);
    console.log(`Resend Email Status: ${emailSent ? "SENT via Resend API" : "Console Fallback (Set RESEND_API_KEY in .env.local)"}`);
    console.log("========================================================\n");

    return NextResponse.json({
      success: true,
      message: "Password reset instructions sent! Please check your inbox.",
      resetUrlPreview: !resendApiKey ? resetUrl : undefined, // For easy testing if Resend key not added yet
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to process request" },
      { status: 500 }
    );
  }
}
