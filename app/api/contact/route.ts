import { NextResponse } from "next/server";
import { z } from "zod";
import { dbConnect } from "@/lib/db/mongoose";
import { Lead } from "@/models/Lead";
import { checkRateLimit, recordFailedAttempt } from "@/lib/security/rateLimiter";
import { getClientIp } from "@/lib/utils/server";
import { getConfigValue, isDatabaseConfigured } from "@/lib/config/platformConfig";
import { isEmailConfigured, sendEmail } from "@/lib/email/resend";
import { appUrl, renderEmail } from "@/lib/email/templates";
import { siteConfig } from "@site/content/site";

// Website contact form: saves the lead for the super admin's Leads page and emails the POS owner.

const enquirySchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(200),
  company: z.string().trim().max(160).optional().default(""),
  phone: z.string().trim().max(40).optional().default(""),
  business: z.string().trim().max(80).optional().default(""),
  message: z.string().trim().min(1).max(4000),
});

const WINDOW_MS = 60 * 60 * 1000;

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const parsed = enquirySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please fill in your name, a valid email and a message." }, { status: 400 });
  }
  const e = parsed.data;
  const ip = getClientIp(req);

  const hasDb = isDatabaseConfigured();
  const hasEmail = isEmailConfigured();
  if (!hasDb && !hasEmail) {
    return NextResponse.json(
      { error: `Online enquiries are not available right now. Please email ${siteConfig.email} or call ${siteConfig.phone}.` },
      { status: 503 }
    );
  }

  // Every submission counts, so the form cannot be used to spam the inbox
  if (hasDb) {
    const rateKey = `contact_ip:${ip}`;
    const limit = await checkRateLimit(rateKey, 5, WINDOW_MS);
    if (!limit.success) {
      return NextResponse.json({ error: "Too many messages. Please try again later." }, { status: 429 });
    }
    await recordFailedAttempt(rateKey, WINDOW_MS);
  }

  // 1. Save the lead so it shows up in Super Admin → Leads, even if email fails
  let leadId: string | null = null;
  if (hasDb) {
    await dbConnect();
    const lead = await Lead.create({
      name: e.name,
      email: e.email,
      company: e.company || undefined,
      phone: e.phone || undefined,
      businessType: e.business || undefined,
      message: e.message,
      ipAddress: ip,
    });
    leadId = String(lead._id);
  }

  // 2. Email the POS owner
  const notifyTo = getConfigValue("leadNotifyEmail") || siteConfig.email;
  let emailError: string | undefined;
  if (hasEmail) {
    const result = await sendEmail({
      to: notifyTo,
      subject: `New website lead: ${e.name}${e.company ? ` (${e.company})` : ""}`,
      html: renderEmail({
        heading: "New enquiry from the website",
        blocks: [
          {
            type: "table",
            rows: [
              ["Name", e.name],
              ["Email", e.email],
              ["Phone", e.phone],
              ["Business", e.company],
              ["Business type", e.business],
            ],
          },
          { type: "text", text: e.message },
          ...(leadId ? [{ type: "button" as const, label: "OPEN IN SUPER ADMIN", href: appUrl("/super-admin/leads") }] : []),
        ],
      }),
    });
    if (!result.ok) emailError = result.error;

    // 3. Let the visitor know we got it (failure here doesn't matter to them)
    await sendEmail({
      to: e.email,
      subject: `We received your message — ${siteConfig.name}`,
      html: renderEmail({
        heading: "Thanks for getting in touch",
        greeting: `Hello ${e.name},`,
        blocks: [
          { type: "text", text: `We've received your enquiry about ${siteConfig.name}. Our team will contact you shortly to set up a demo.` },
          { type: "text", text: `If it's urgent, call us on ${siteConfig.phone}.` },
        ],
      }),
    });
  }

  if (leadId) {
    await Lead.updateOne({ _id: leadId }, { emailedTo: hasEmail && !emailError ? notifyTo : undefined, emailError });
  } else if (emailError) {
    // No database and the email failed: nothing was recorded, so the visitor must be told
    console.error("Contact form email failed:", emailError);
    return NextResponse.json({ error: `We couldn't send your message. Please email ${siteConfig.email} directly.` }, { status: 502 });
  }

  return NextResponse.json({ success: true });
}
