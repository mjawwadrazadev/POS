import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db/mongoose";
import { User } from "@/models/User";
import { DemoSession } from "@/models/DemoSession";
import { requireSuperAdminAction } from "@/lib/middleware/requireSuperAdminAction";
import { cleanupExpiredDemos } from "@/lib/demo/demoStore";
import { computeDemoStats } from "@/lib/demo/stats";
import { serializePlatformUser } from "@/lib/demo/serialize";

// GET: every sales agent with their demo progress (super admin / admin)
export async function GET() {
  const auth = await requireSuperAdminAction("view_agents");
  if (!auth.authorized) return auth.response;

  await dbConnect();
  await cleanupExpiredDemos();

  const [agents, demos] = await Promise.all([
    User.find({ role: "platform_agent" }).sort({ fullName: 1 }).lean(),
    DemoSession.find({})
      .select("agentId agentName status outcome satisfaction closeChance converted createdAt")
      .lean(),
  ]);

  const byAgent = new Map<string, any[]>();
  for (const d of demos) {
    const key = String(d.agentId);
    if (!byAgent.has(key)) byAgent.set(key, []);
    byAgent.get(key)!.push(d);
  }

  const rows = agents.map((a) => {
    const own = byAgent.get(String(a._id)) || [];
    const last = own.reduce<Date | null>((m, d) => (!m || d.createdAt > m ? d.createdAt : m), null);
    return { ...serializePlatformUser(a), stats: computeDemoStats(own), lastDemoAt: last };
  });

  return NextResponse.json({ success: true, agents: rows, totals: computeDemoStats(demos) });
}
