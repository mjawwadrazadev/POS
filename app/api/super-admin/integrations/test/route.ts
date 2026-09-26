import { NextResponse } from "next/server";
import { requireSuperAdminAction } from "@/lib/middleware/requireSuperAdminAction";
import { testMongoConnection } from "@/lib/db/mongoose";
import { sendEmail } from "@/lib/email/resend";
import { getConfigValue, validateMongoUriFormat } from "@/lib/config/platformConfig";

/**
 * Body: { target: "mongodb", mongodbUri?: string }  — tests the given URL, or the saved one
 *       { target: "email", to: string }              — sends a test email with the saved Resend settings
 */
export async function POST(req: Request) {
  const auth = await requireSuperAdminAction("manage_integrations");
  if (!auth.authorized) return auth.response;

  const body = await req.json().catch(() => ({}));

  if (body?.target === "mongodb") {
    const uri = (typeof body.mongodbUri === "string" && body.mongodbUri.trim()) || getConfigValue("mongodbUri");
    if (!uri) return NextResponse.json({ error: "No MongoDB URL to test" }, { status: 400 });

    const formatError = validateMongoUriFormat(uri);
    if (formatError) return NextResponse.json({ error: formatError }, { status: 400 });

    const result = await testMongoConnection(uri);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({
      success: true,
      message: `Connected to database "${result.dbName}" (${result.superAdminCount} super admin account(s) found)`,
    });
  }

  if (body?.target === "email") {
    const to = typeof body.to === "string" ? body.to.trim() : "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      return NextResponse.json({ error: "Enter a valid recipient email" }, { status: 400 });
    }

    const result = await sendEmail({
      to,
      subject: "RST POS — Resend integration test",
      html: `<div style="font-family: Arial, sans-serif;"><h2>Email delivery is working ✅</h2><p>This test was sent from the RST POS super admin Integrations tab.</p></div>`,
    });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ success: true, message: `Test email sent to ${to}` });
  }

  return NextResponse.json({ error: "Unknown test target" }, { status: 400 });
}
