import { NextResponse } from "next/server";
import { dbConnect, resetDbConnection, testMongoConnection } from "@/lib/db/mongoose";
import { Organization } from "@/models/Organization";
import { Branch } from "@/models/Branch";
import { User } from "@/models/User";
import { logAudit } from "@/lib/audit/logger";
import { getClientIp } from "@/lib/utils/server";
import {
  ConfigWriteError,
  getJwtSecret,
  isDatabaseConfigured,
  updateConfig,
  validateMongoUriFormat,
} from "@/lib/config/platformConfig";

// Same code the demo seed uses, so platform jobs and tenant lists already exclude this organisation
const PLATFORM_ORG_CODE = "rst-hq";

/**
 * First-run setup wizard API. It is unauthenticated by necessity (there is no account to log in
 * with yet), so every write is refused as soon as the platform has a super admin.
 */
async function getSetupState(): Promise<{
  databaseConfigured: boolean;
  databaseReachable: boolean;
  superAdminExists: boolean;
  databaseError?: string;
}> {
  if (!isDatabaseConfigured()) {
    return { databaseConfigured: false, databaseReachable: false, superAdminExists: false };
  }
  try {
    await dbConnect();
    const superAdminExists = !!(await User.exists({ role: "super_admin" }));
    return { databaseConfigured: true, databaseReachable: true, superAdminExists };
  } catch (err: any) {
    return {
      databaseConfigured: true,
      databaseReachable: false,
      superAdminExists: false,
      databaseError: err?.message || "Could not connect to the database",
    };
  }
}

export async function GET() {
  const state = await getSetupState();
  return NextResponse.json({ success: true, ...state, setupComplete: state.superAdminExists });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const state = await getSetupState();

  if (state.superAdminExists) {
    return NextResponse.json(
      { error: "Setup is already complete. Sign in at /super-admin/login and use the Integrations tab." },
      { status: 403 }
    );
  }

  // ─── Step 1: connect the database ───
  if (body?.step === "database") {
    // A configured-but-unreachable database might hold a super admin we cannot see, so it may not be
    // replaced from this public endpoint — fix it on the server (config file / env) instead.
    if (state.databaseConfigured && !state.databaseReachable) {
      return NextResponse.json(
        {
          error:
            "A database is already configured but cannot be reached. Fix it in the server's .data/platform-config.json or MONGODB_URI, then reload.",
        },
        { status: 409 }
      );
    }

    const mongodbUri = typeof body.mongodbUri === "string" ? body.mongodbUri.trim() : "";
    const formatError = validateMongoUriFormat(mongodbUri);
    if (formatError) return NextResponse.json({ error: formatError }, { status: 400 });

    const test = await testMongoConnection(mongodbUri);
    if (!test.ok) {
      return NextResponse.json({ error: `Could not connect: ${test.error}` }, { status: 400 });
    }

    try {
      updateConfig({ mongodbUri });
      getJwtSecret(); // make sure a signing secret exists before the first login
    } catch (err) {
      if (err instanceof ConfigWriteError) return NextResponse.json({ error: err.message }, { status: 409 });
      throw err;
    }
    await resetDbConnection();

    return NextResponse.json({
      success: true,
      dbName: test.dbName,
      superAdminExists: !!test.superAdminCount,
    });
  }

  // ─── Step 2: create the first super admin ───
  if (body?.step === "admin") {
    if (!state.databaseReachable) {
      return NextResponse.json({ error: "Connect the database first" }, { status: 409 });
    }

    const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
    const email = typeof body.email === "string" ? body.email.toLowerCase().trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const pin = typeof body.pin === "string" ? body.pin.trim() : "";

    if (fullName.length < 2) return NextResponse.json({ error: "Enter your full name" }, { status: 400 });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }
    if (!/^\d{4}$/.test(pin)) return NextResponse.json({ error: "PIN must be exactly 4 digits" }, { status: 400 });

    let org = await Organization.findOne({ code: PLATFORM_ORG_CODE });
    if (!org) {
      org = await Organization.create({
        name: "RST POS Platform HQ",
        code: PLATFORM_ORG_CODE,
        email,
        subscriptionPlan: "custom",
        subscriptionFee: 0,
        subscriptionStatus: "active",
        expiryDate: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000),
      });
    }

    let branch = await Branch.findOne({ organizationId: org._id, code: "HQ-01" });
    if (!branch) {
      branch = await Branch.create({
        organizationId: org._id,
        name: "HQ Operations",
        code: "HQ-01",
        city: "Head Office",
        isMain: true,
      });
    }

    // Re-check right before writing to narrow the window for two simultaneous setup requests
    if (await User.exists({ role: "super_admin" })) {
      return NextResponse.json({ error: "Setup is already complete" }, { status: 403 });
    }

    const superAdmin = await User.create({
      organizationId: org._id,
      branchId: branch._id,
      fullName,
      email,
      password,
      pin,
      role: "super_admin",
      isActive: true,
    });

    await logAudit({
      organizationId: org._id,
      actorId: superAdmin._id as any,
      actorName: fullName,
      actorRole: "super_admin",
      action: "platform.setup.super_admin_created",
      targetCollection: "User",
      targetId: superAdmin._id as any,
      ipAddress: getClientIp(req),
    });

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unknown setup step" }, { status: 400 });
}
