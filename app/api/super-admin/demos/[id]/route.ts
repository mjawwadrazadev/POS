import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/db/mongoose";
import { DemoSession } from "@/models/DemoSession";
import { requireSuperAdminAction } from "@/lib/middleware/requireSuperAdminAction";
import { isFullPlatformRole } from "@/lib/auth/permissions";
import { endDemo } from "@/lib/demo/demoStore";
import { serializeDemo } from "@/lib/demo/serialize";
import { logAudit } from "@/lib/audit/logger";
import { getClientIp } from "@/lib/utils/server";

const OUTCOMES = ["pending", "successful", "unsuccessful"];
const SATISFACTION = ["satisfied", "neutral", "not_satisfied"];
const CLOSE_CHANCES = ["high", "medium", "low", "none"];

async function loadOwnDemo(id: string, session: { userId: string; role: string }) {
  if (!mongoose.isValidObjectId(id)) return { error: NextResponse.json({ error: "Invalid demo" }, { status: 400 }) };
  await dbConnect();
  const demo = await DemoSession.findById(id).select("+demoPassword +demoPin");
  if (!demo) return { error: NextResponse.json({ error: "Demo not found" }, { status: 404 }) };
  // Agents only touch their own demos; super admin / admin may touch any
  if (String(demo.agentId) !== session.userId && !isFullPlatformRole(session.role)) {
    return { error: NextResponse.json({ error: "Demo not found" }, { status: 404 }) };
  }
  return { demo };
}

// PATCH: the agent's report after the demo
// { outcome?, satisfaction?, closeChance?, converted?, feedback?, followUpDate? }
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSuperAdminAction("run_demos");
  if (!auth.authorized) return auth.response;
  const session = auth.session!;

  const { id } = await params;
  const { demo, error } = await loadOwnDemo(id, session);
  if (error) return error;

  const body = await req.json();
  if (body.outcome !== undefined) {
    if (!OUTCOMES.includes(body.outcome)) return NextResponse.json({ error: "Invalid outcome" }, { status: 400 });
    demo.outcome = body.outcome;
  }
  if (body.satisfaction !== undefined) {
    if (body.satisfaction && !SATISFACTION.includes(body.satisfaction)) {
      return NextResponse.json({ error: "Invalid satisfaction" }, { status: 400 });
    }
    demo.satisfaction = body.satisfaction || undefined;
  }
  if (body.closeChance !== undefined) {
    if (body.closeChance && !CLOSE_CHANCES.includes(body.closeChance)) {
      return NextResponse.json({ error: "Invalid close chance" }, { status: 400 });
    }
    demo.closeChance = body.closeChance || undefined;
  }
  if (body.converted !== undefined) demo.converted = !!body.converted;
  if (body.feedback !== undefined) demo.feedback = String(body.feedback).slice(0, 4000);
  if (body.followUpDate !== undefined) {
    const date = body.followUpDate ? new Date(body.followUpDate) : undefined;
    if (date && Number.isNaN(date.getTime())) return NextResponse.json({ error: "Invalid follow-up date" }, { status: 400 });
    demo.followUpDate = date;
  }
  // A closed sale is always a successful demo
  if (demo.converted) demo.outcome = "successful";
  demo.reportedAt = new Date();
  await demo.save();

  await logAudit({
    organizationId: session.organizationId,
    actorId: session.userId,
    actorName: session.fullName || session.email,
    actorRole: session.role,
    action: "DEMO_REPORTED",
    targetCollection: "DemoSession",
    targetId: demo._id as any,
    after: { outcome: demo.outcome, satisfaction: demo.satisfaction, closeChance: demo.closeChance, converted: demo.converted },
    ipAddress: getClientIp(req),
  });

  return NextResponse.json({
    success: true,
    demo: serializeDemo(demo.toObject(), { withCredentials: String(demo.agentId) === session.userId }),
  });
}

// DELETE: end a running demo now — the demo store and all its data are deleted, the record stays
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSuperAdminAction("run_demos");
  if (!auth.authorized) return auth.response;
  const session = auth.session!;

  const { id } = await params;
  const { demo, error } = await loadOwnDemo(id, session);
  if (error) return error;
  if (demo.status !== "active") return NextResponse.json({ error: "This demo has already ended" }, { status: 400 });

  try {
    await endDemo(demo, "ended_by_agent");
  } catch (err: any) {
    return NextResponse.json(
      { error: process.env.NODE_ENV === "production" ? "Failed to end demo" : err.message },
      { status: 500 }
    );
  }

  await logAudit({
    organizationId: session.organizationId,
    actorId: session.userId,
    actorName: session.fullName || session.email,
    actorRole: session.role,
    action: "DEMO_ENDED",
    targetCollection: "DemoSession",
    targetId: demo._id as any,
    after: { storeCode: demo.storeCode, activity: demo.activity },
    ipAddress: getClientIp(req),
  });

  return NextResponse.json({ success: true });
}
