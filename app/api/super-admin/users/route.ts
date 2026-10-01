import { NextResponse } from "next/server";
import crypto from "crypto";
import { dbConnect } from "@/lib/db/mongoose";
import { User } from "@/models/User";
import { requireSuperAdminAction } from "@/lib/middleware/requireSuperAdminAction";
import { ASSIGNABLE_PLATFORM_ROLES, PLATFORM_ROLES, Role } from "@/lib/auth/permissions";
import { logAudit } from "@/lib/audit/logger";
import { generateTempPassword, getClientIp } from "@/lib/utils/server";
import { serializePlatformUser } from "@/lib/demo/serialize";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// GET: every platform staff account (super admin, admins, support, agents)
export async function GET() {
  const auth = await requireSuperAdminAction("manage_platform_users");
  if (!auth.authorized) return auth.response;

  await dbConnect();
  const users = await User.find({ role: { $in: PLATFORM_ROLES } }).sort({ createdAt: 1 }).lean();
  return NextResponse.json({ success: true, users: users.map(serializePlatformUser) });
}

// POST: create an admin, support or agent account in the platform HQ organisation
export async function POST(req: Request) {
  const auth = await requireSuperAdminAction("manage_platform_users");
  if (!auth.authorized) return auth.response;
  const session = auth.session!;

  try {
    await dbConnect();
    const body = await req.json();
    const fullName = String(body.fullName || "").trim();
    const email = String(body.email || "").toLowerCase().trim();
    const role = String(body.role || "") as Role;
    const password = body.password ? String(body.password) : "";

    if (!fullName || !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "Full name and a valid email are required" }, { status: 400 });
    }
    if (!ASSIGNABLE_PLATFORM_ROLES.includes(role)) {
      return NextResponse.json({ error: "Role must be Admin, Sales Agent or Platform Support" }, { status: 400 });
    }
    if (password && password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }
    const commissionRate =
      body.commissionRate === "" || body.commissionRate == null ? undefined : Number(body.commissionRate);
    if (commissionRate !== undefined && (!Number.isFinite(commissionRate) || commissionRate < 0 || commissionRate > 100)) {
      return NextResponse.json({ error: "Commission must be between 0 and 100%" }, { status: 400 });
    }
    if (await User.exists({ email })) {
      return NextResponse.json({ error: `An account with email '${email}' already exists` }, { status: 400 });
    }

    const tempPassword = password ? undefined : generateTempPassword();
    const user = await User.create({
      organizationId: session.organizationId, // platform HQ
      fullName,
      email,
      password: password || tempPassword,
      // Platform accounts never log in by PIN, but the schema requires one
      pin: String(crypto.randomInt(1000, 10000)),
      role,
      isActive: true,
      phone: body.phone ? String(body.phone).trim() : undefined,
      territory: body.territory ? String(body.territory).trim() : undefined,
      commissionRate: role === "platform_agent" ? commissionRate : undefined,
      createdBy: session.userId,
    });

    await logAudit({
      organizationId: session.organizationId,
      actorId: session.userId,
      actorName: session.fullName || session.email,
      actorRole: session.role,
      action: "PLATFORM_USER_CREATED",
      targetCollection: "User",
      targetId: user._id as any,
      after: { email, role },
      ipAddress: getClientIp(req),
    });

    // tempPassword is shown once so the admin can hand it over
    return NextResponse.json({ success: true, user: serializePlatformUser(user), tempPassword });
  } catch (error: any) {
    return NextResponse.json(
      { error: process.env.NODE_ENV === "production" ? "Failed to create user" : error.message },
      { status: 500 }
    );
  }
}
