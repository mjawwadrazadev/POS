import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db/mongoose";
import { Branch } from "@/models/Branch";
import { getSession } from "@/lib/auth/session";
import { checkBranchLimit } from "@/lib/middleware/enforcePlanLimits";
import { logAudit } from "@/lib/audit/logger";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await dbConnect();
    const branches = await Branch.find({ organizationId: session.organizationId }).sort({ isMain: -1, createdAt: 1 }).lean();
    return NextResponse.json({ success: true, branches });
  } catch {
    return NextResponse.json({ error: "Failed to fetch branches" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Forbidden — Store Admin access required to create branches" }, { status: 403 });
    }

    await dbConnect();

    const limitCheck = await checkBranchLimit(session.organizationId);
    if (!limitCheck.allowed) {
      return NextResponse.json({ error: limitCheck.message }, { status: 403 });
    }

    const { name, code, city, address, phone } = await req.json();
    const cleanName = String(name || "").trim();
    const cleanCode = String(code || "").trim().toUpperCase();

    if (!cleanName || !cleanCode) {
      return NextResponse.json({ error: "Branch name and code are required" }, { status: 400 });
    }
    if (!/^[A-Z0-9-]{2,20}$/.test(cleanCode)) {
      return NextResponse.json({ error: "Branch code may only contain letters, numbers and dashes (2–20 chars)" }, { status: 400 });
    }
    if (await Branch.exists({ organizationId: session.organizationId, code: cleanCode })) {
      return NextResponse.json({ error: `Branch code '${cleanCode}' is already used` }, { status: 400 });
    }

    const branch = await Branch.create({
      organizationId: session.organizationId,
      name: cleanName,
      code: cleanCode,
      city: String(city || "").trim() || "—",
      address: String(address || "").trim(),
      phone: String(phone || "").trim(),
      isMain: false,
    });

    await logAudit({
      organizationId: session.organizationId,
      actorId: session.userId,
      actorName: session.fullName || session.email,
      actorRole: session.role,
      action: "branch.create",
      targetCollection: "Branch",
      targetId: branch._id as any,
      after: { name: branch.name, code: branch.code },
    });

    return NextResponse.json({ success: true, branch });
  } catch (error: any) {
    return NextResponse.json(
      { error: process.env.NODE_ENV === "production" ? "Failed to create branch" : error.message },
      { status: 500 }
    );
  }
}
