import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db/mongoose";
import { Organization } from "@/models/Organization";
import { getSession } from "@/lib/auth/session";
import { logAudit } from "@/lib/audit/logger";
import { getClientIp } from "@/lib/utils/server";
import { toStoredLogo } from "@/lib/branding/logoImage";

// PUT: the store owner (admin) sets or removes their own store logo
export async function PUT(req: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin" || !session.organizationId) {
      return NextResponse.json({ error: "Forbidden — Store Admin access required" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    // Any uploaded PNG / JPG / WebP is saved as a small WebP
    const logo = await toStoredLogo(body.logoUrl);
    if (logo.error) return NextResponse.json({ error: logo.error }, { status: 400 });

    await dbConnect();
    const org = await Organization.findByIdAndUpdate(
      session.organizationId,
      logo.value ? { $set: { logoUrl: logo.value } } : { $unset: { logoUrl: 1 } },
      { new: true }
    ).select("_id");
    if (!org) return NextResponse.json({ error: "Store not found" }, { status: 404 });

    await logAudit({
      organizationId: session.organizationId,
      actorId: session.userId,
      actorName: session.fullName || session.email,
      actorRole: session.role,
      action: logo.value ? "STORE_LOGO_UPDATED" : "STORE_LOGO_REMOVED",
      targetCollection: "Organization",
      targetId: session.organizationId,
      ipAddress: getClientIp(req),
    });

    return NextResponse.json({ success: true, logoUrl: logo.value });
  } catch {
    return NextResponse.json({ error: "Failed to update logo" }, { status: 500 });
  }
}
