import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/db/mongoose";
import { requireSuperAdminAction } from "@/lib/middleware/requireSuperAdminAction";
import { Organization } from "@/models/Organization";
import { Order } from "@/models/Order";
import { logAudit } from "@/lib/audit/logger";
import { getClientIp } from "@/lib/utils/server";
import { describeFbrSettings, normalizeFbrSettings } from "@/lib/fbr/settings";
import { getActiveFbrSettings, testFbrConnection } from "@/lib/fbr/client";

type Params = { params: Promise<{ id: string }> };

async function loadOrg(id: string) {
  if (!mongoose.isValidObjectId(id)) return null;
  return Organization.findById(id).select("+fbr.token");
}

// GET: the tenant's FBR settings (token masked) and reporting counts
export async function GET(_req: Request, { params }: Params) {
  const auth = await requireSuperAdminAction("manage_fbr");
  if (!auth.authorized) return auth.response;
  await dbConnect();

  const { id } = await params;
  const org = await loadOrg(id);
  if (!org) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

  const counts = await Order.aggregate([
    { $match: { organizationId: org._id, "fbr.status": { $exists: true } } },
    { $group: { _id: "$fbr.status", count: { $sum: 1 } } },
  ]);
  const byStatus = Object.fromEntries(counts.map((c: any) => [c._id, c.count]));

  return NextResponse.json({
    success: true,
    fbr: describeFbrSettings(org.fbr, !!org.fbr?.token),
    stats: { reported: byStatus.reported || 0, failed: (byStatus.failed || 0) + (byStatus.pending || 0) },
  });
}

// PUT: save (or disable) the tenant's FBR settings
export async function PUT(req: Request, { params }: Params) {
  const auth = await requireSuperAdminAction("manage_fbr");
  if (!auth.authorized) return auth.response;
  await dbConnect();

  const { id } = await params;
  const org = await loadOrg(id);
  if (!org) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const { settings, error } = normalizeFbrSettings(body, { hasSavedToken: !!org.fbr?.token });
  if (error) return NextResponse.json({ error }, { status: 400 });

  // Keep the saved token when the form leaves it blank; keep old credentials when disabling
  const previous: any = org.fbr ? (org.fbr as any).toObject?.() ?? org.fbr : {};
  org.set("fbr", settings!.enabled ? { ...previous, ...settings } : { ...previous, enabled: false, updatedAt: new Date() });
  await org.save();

  await logAudit({
    organizationId: org._id as any,
    actorId: auth.session.userId,
    actorName: auth.session.fullName || auth.session.email,
    actorRole: auth.session.role,
    action: settings!.enabled ? "fbr.settings_updated" : "fbr.disabled",
    targetCollection: "Organization",
    targetId: org._id as any,
    // never log the token
    after: settings!.enabled ? { mode: settings!.mode, environment: settings!.environment, tokenChanged: !!body.token } : { enabled: false },
    ipAddress: getClientIp(req),
  });

  return NextResponse.json({ success: true, fbr: describeFbrSettings(org.fbr, !!org.fbr?.token) });
}

// POST: test the saved credentials against FBR
export async function POST(_req: Request, { params }: Params) {
  const auth = await requireSuperAdminAction("manage_fbr");
  if (!auth.authorized) return auth.response;
  await dbConnect();

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  const settings = await getActiveFbrSettings(id);
  if (!settings) return NextResponse.json({ error: "Save and enable complete FBR settings first" }, { status: 400 });

  const result = await testFbrConnection(settings);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({
    success: true,
    message: `FBR accepted the test invoice${result.invoiceNumber ? ` (${result.invoiceNumber})` : ""}. ${result.note || ""}`.trim(),
  });
}
