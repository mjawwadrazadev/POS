import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db/mongoose";
import { Branch } from "@/models/Branch";
import { getSession } from "@/lib/auth/session";
import { checkBranchLimit } from "@/lib/middleware/enforcePlanLimits";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await dbConnect();
    const branches = await Branch.find({ organizationId: session.organizationId }).lean();
    return NextResponse.json({ success: true, branches });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch branches" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "admin" && session.role !== "super_admin")) {
      return NextResponse.json({ error: "Forbidden — Admin access required to create branches" }, { status: 403 });
    }

    await dbConnect();

    // 🔒 Enforce Plan Limits Guard
    const limitCheck = await checkBranchLimit(session.organizationId);
    if (!limitCheck.allowed) {
      return NextResponse.json({ error: limitCheck.message }, { status: 403 });
    }

    const body = await req.json();
    const { name, code, city, address, phone } = body;

    if (!name || !code) {
      return NextResponse.json({ error: "Branch name and code are required" }, { status: 400 });
    }

    const branch = await Branch.create({
      organizationId: session.organizationId,
      name,
      code,
      city: city || "Main",
      address: address || "",
      phone: phone || "",
      isMain: false,
    });

    return NextResponse.json({ success: true, branch });
  } catch (error: any) {
    return NextResponse.json(
      { error: process.env.NODE_ENV === "production" ? "Failed to create branch" : error.message },
      { status: 500 }
    );
  }
}
