import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/db/mongoose";
import { DemoSession } from "@/models/DemoSession";
import { requireSuperAdminAction } from "@/lib/middleware/requireSuperAdminAction";
import { isFullPlatformRole } from "@/lib/auth/permissions";
import { VERTICAL_CONFIGS, BusinessType } from "@/lib/config/verticals";
import { cleanupExpiredDemos, createDemoStore, MAX_ACTIVE_DEMOS_PER_AGENT } from "@/lib/demo/demoStore";
import { serializeDemo } from "@/lib/demo/serialize";
import { computeDemoStats } from "@/lib/demo/stats";
import { logAudit } from "@/lib/audit/logger";
import { getClientIp } from "@/lib/utils/server";

const clean = (v: unknown, max = 200) => (v == null ? "" : String(v).trim().slice(0, max));

// GET: an agent sees their own demos; super admin / admin may pass ?agentId= or see everyone's
export async function GET(req: Request) {
  const auth = await requireSuperAdminAction("run_demos");
  if (!auth.authorized) return auth.response;
  const session = auth.session!;

  await dbConnect();
  await cleanupExpiredDemos(); // expired demo stores are wiped before anyone looks at the list

  const agentIdParam = new URL(req.url).searchParams.get("agentId");
  const filter: Record<string, unknown> = {};
  if (!isFullPlatformRole(session.role)) {
    filter.agentId = session.userId;
  } else if (agentIdParam && mongoose.isValidObjectId(agentIdParam)) {
    filter.agentId = agentIdParam;
  } else if (agentIdParam === "me") {
    filter.agentId = session.userId;
  }

  const demos = await DemoSession.find(filter)
    .select("+demoPassword +demoPin")
    .sort({ createdAt: -1 })
    .limit(500)
    .lean();

  return NextResponse.json({
    success: true,
    // Login details only go to the person who created the demo
    demos: demos.map((d) => serializeDemo(d, { withCredentials: String(d.agentId) === session.userId })),
    stats: computeDemoStats(demos),
  });
}

// POST: create a 24-hour demo store for a prospective client
export async function POST(req: Request) {
  const auth = await requireSuperAdminAction("run_demos");
  if (!auth.authorized) return auth.response;
  const session = auth.session!;

  try {
    const body = await req.json();
    const businessType = clean(body.businessType, 30) as BusinessType;
    const clientName = clean(body.clientName, 100);
    const clientBusinessName = clean(body.clientBusinessName, 100);

    if (!VERTICAL_CONFIGS[businessType]) return NextResponse.json({ error: "Select a business type" }, { status: 400 });
    if (!clientName || !clientBusinessName) {
      return NextResponse.json({ error: "Client name and business name are required" }, { status: 400 });
    }

    await dbConnect();
    await cleanupExpiredDemos();
    const activeCount = await DemoSession.countDocuments({ agentId: session.userId, status: "active" });
    if (activeCount >= MAX_ACTIVE_DEMOS_PER_AGENT) {
      return NextResponse.json(
        { error: `You already have ${activeCount} running demos. End one before starting a new demo.` },
        { status: 400 }
      );
    }

    const demo = await createDemoStore(
      { userId: session.userId, name: session.fullName || session.email },
      {
        businessType,
        clientName,
        clientBusinessName,
        clientPhone: clean(body.clientPhone, 30) || undefined,
        clientCity: clean(body.clientCity, 60) || undefined,
        notes: clean(body.notes, 2000) || undefined,
      }
    );

    // Logged against the platform HQ so the record survives the demo store's deletion
    await logAudit({
      organizationId: session.organizationId,
      actorId: session.userId,
      actorName: session.fullName || session.email,
      actorRole: session.role,
      action: "DEMO_CREATED",
      targetCollection: "DemoSession",
      targetId: demo._id as any,
      after: { storeCode: demo.storeCode, businessType, clientBusinessName, expiresAt: demo.expiresAt },
      ipAddress: getClientIp(req),
    });

    return NextResponse.json({ success: true, demo: serializeDemo(demo.toObject(), { withCredentials: true }) });
  } catch (error: any) {
    return NextResponse.json(
      { error: process.env.NODE_ENV === "production" ? "Failed to create demo" : error.message },
      { status: 500 }
    );
  }
}
