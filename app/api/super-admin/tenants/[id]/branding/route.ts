import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/db/mongoose";
import { Organization } from "@/models/Organization";
import { requireSuperAdminAction } from "@/lib/middleware/requireSuperAdminAction";
import { logAudit } from "@/lib/audit/logger";
import { getClientIp } from "@/lib/utils/server";
import { toStoredLogo } from "@/lib/branding/logoImage";

// GET: the tenant's logo (kept out of the tenant list because it is an inline image)
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireSuperAdminAction("read_analytics");
    if (!auth.authorized) return auth.response;

    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    await dbConnect();
    const org = await Organization.findById(id).select("name +logoUrl").lean();
    if (!org) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    return NextResponse.json({ success: true, name: org.name, logoUrl: org.logoUrl || "" });
  } catch {
    return NextResponse.json({ error: "Failed to load branding" }, { status: 500 });
  }
}

// PUT: set or remove the tenant's logo (super admin only, same as provisioning)
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireSuperAdminAction("manage_pricing");
    if (!auth.authorized) return auth.response;
    const session = auth.session!;

    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    // Any uploaded PNG / JPG / WebP is saved as a small WebP
    const logo = await toStoredLogo(body.logoUrl);
    if (logo.error) return NextResponse.json({ error: logo.error }, { status: 400 });

    await dbConnect();
    const org = await Organization.findByIdAndUpdate(
      id,
      logo.value ? { $set: { logoUrl: logo.value } } : { $unset: { logoUrl: 1 } },
      { new: true }
    ).select("_id");
    if (!org) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    await logAudit({
      organizationId: org._id as any,
      actorId: session.userId,
      actorName: session.fullName || session.email,
      actorRole: session.role,
      action: logo.value ? "TENANT_LOGO_UPDATED" : "TENANT_LOGO_REMOVED",
      targetCollection: "Organization",
      targetId: org._id as any,
      ipAddress: getClientIp(req),
    });

    return NextResponse.json({ success: true, logoUrl: logo.value });
  } catch {
    return NextResponse.json({ error: "Failed to update logo" }, { status: 500 });
  }
}
