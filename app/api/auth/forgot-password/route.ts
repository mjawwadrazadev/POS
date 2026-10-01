import { NextResponse } from "next/server";
import crypto from "crypto";
import { dbConnect } from "@/lib/db/mongoose";
import { User } from "@/models/User";
import { Organization } from "@/models/Organization";
import { PasswordResetToken, hashResetToken } from "@/models/PasswordResetToken";
import { StaffResetRequest } from "@/models/StaffResetRequest";
import { checkRateLimit, recordFailedAttempt } from "@/lib/security/rateLimiter";
import { getClientIp } from "@/lib/utils/server";
import { getConfigValue } from "@/lib/config/platformConfig";
import { sendEmail } from "@/lib/email/resend";
import { appUrl, renderEmail } from "@/lib/email/templates";

/**
 * Forgot password.
 * - Store owners (admin) and platform staff get a one-hour reset link by email.
 * - Employees (manager, cashier) can't reset themselves: a request goes to their own store's admins
 *   (in Settings → Team and by email). It never goes to the super admin.
 * The response is the same in every case, so it can't be used to find out which emails exist.
 */

const GENERIC_RESPONSE = {
  success: true,
  message:
    "If an active account exists for this email, we've sent a reset link — or, for staff accounts, asked your store owner to reset it.",
};

const SELF_SERVICE_ROLES = ["admin", "super_admin", "platform_admin", "platform_support", "platform_agent"];
const STAFF_ROLES = ["manager", "cashier"];

export async function POST(req: Request) {
  try {
    await dbConnect();
    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email address is required" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Every request counts (success or not): limits reset spam per address and per client
    const keys = [`forgot:${normalizedEmail}`, `forgot_ip:${getClientIp(req)}`];
    const [byEmail, byIp] = await Promise.all([
      checkRateLimit(keys[0], 3, 60 * 60 * 1000),
      checkRateLimit(keys[1], 20, 60 * 60 * 1000),
    ]);
    if (!byEmail.success || !byIp.success) {
      return NextResponse.json({ error: "Too many reset requests. Please try again later." }, { status: 429 });
    }
    await Promise.all(keys.map((k) => recordFailedAttempt(k, 60 * 60 * 1000)));

    const user = await User.findOne({ email: normalizedEmail });
    if (!user || !user.isActive) return NextResponse.json(GENERIC_RESPONSE);

    if (STAFF_ROLES.includes(user.role)) {
      await requestResetFromOwner(user);
      return NextResponse.json(GENERIC_RESPONSE);
    }

    if (SELF_SERVICE_ROLES.includes(user.role)) {
      await sendSelfServiceLink(user, normalizedEmail);
    }
    return NextResponse.json(GENERIC_RESPONSE);
  } catch (error: any) {
    return NextResponse.json(
      { error: process.env.NODE_ENV === "production" ? "Failed to process request" : error.message },
      { status: 500 }
    );
  }
}

async function sendSelfServiceLink(user: any, normalizedEmail: string) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  // Only the newest link works
  await PasswordResetToken.updateMany({ userId: user._id, used: false }, { used: true });
  await PasswordResetToken.create({ userId: user._id, email: normalizedEmail, tokenHash: hashResetToken(token), expiresAt, used: false });

  const resetUrl = appUrl(`/reset-password?token=${token}&email=${encodeURIComponent(normalizedEmail)}`);

  const { ok: emailSent, error: emailError } = await sendEmail({
    to: normalizedEmail,
    subject: "Reset your RST POS password",
    html: renderEmail({
      heading: "Password reset request",
      greeting: `Hello ${user.fullName},`,
      blocks: [
        { type: "text", text: `We received a request to reset the password for your RST POS account (${normalizedEmail}).` },
        { type: "button", label: "RESET MY PASSWORD", href: resetUrl },
        { type: "note", text: "This link expires in 1 hour. If you didn't ask for a reset, you can ignore this email." },
      ],
    }),
  });
  if (emailError && getConfigValue("resendApiKey")) console.error("Resend API error:", emailError);

  // Development fallback only — a reset link is a credential and must never reach production logs
  if (process.env.NODE_ENV !== "production") {
    console.log("\n========================================================");
    console.log("🔑 RST POS PASSWORD RESET LINK (dev only):");
    console.log(`User: ${user.fullName} (${normalizedEmail})`);
    console.log(`Reset URL: ${resetUrl}`);
    console.log(`Email: ${emailSent ? "sent via Resend" : "not sent (add a Resend API key in Super Admin → Integrations)"}`);
    console.log("========================================================\n");
  } else if (!emailSent) {
    console.error(`[Password Reset] Email delivery failed for user ${user._id}`);
  }
}

async function requestResetFromOwner(user: any) {
  // One open request per employee is enough; repeat clicks just re-notify the owner
  let request = await StaffResetRequest.findOne({ userId: user._id, status: "pending" });
  if (!request) {
    request = await StaffResetRequest.create({
      organizationId: user.organizationId,
      userId: user._id,
      userName: user.fullName,
      userEmail: user.email,
      userRole: user.role,
    });
  }

  const [owners, org] = await Promise.all([
    User.find({ organizationId: user.organizationId, role: "admin", isActive: true }).select("fullName email").lean(),
    Organization.findById(user.organizationId).select("name").lean(),
  ]);

  const teamUrl = appUrl("/settings/team");
  await Promise.all(
    owners.map((owner: any) =>
      sendEmail({
        to: owner.email,
        subject: `${user.fullName} needs a password reset`,
        html: renderEmail({
          heading: "Staff password reset request",
          greeting: `Hello ${owner.fullName},`,
          blocks: [
            {
              type: "text",
              text: `${user.fullName} (${user.role}) at ${(org as any)?.name || "your store"} has forgotten their password or PIN and asked you to reset it.`,
            },
            { type: "table", rows: [["Staff member", user.fullName], ["Email", user.email], ["Role", user.role]] },
            { type: "button", label: "RESET IN TEAM SETTINGS", href: teamUrl },
            { type: "note", text: "Only store admins receive this. If you didn't expect it, you can dismiss the request in Team settings." },
          ],
        }),
      }).then((r) => {
        if (!r.ok && getConfigValue("resendApiKey")) console.error("Resend API error (staff reset):", r.error);
      })
    )
  );

  if (process.env.NODE_ENV !== "production") {
    console.log(`🔑 Staff reset request ${request._id}: ${user.fullName} → ${owners.length} store admin(s)`);
  }
}
