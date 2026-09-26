import { NextResponse } from "next/server";
import { requireSuperAdminAction } from "@/lib/middleware/requireSuperAdminAction";
import { signToken, setSessionCookie } from "@/lib/auth/session";
import { resetDbConnection, testMongoConnection } from "@/lib/db/mongoose";
import { logAudit } from "@/lib/audit/logger";
import { getClientIp } from "@/lib/utils/server";
import {
  CONFIG_KEYS,
  ConfigKey,
  ConfigWriteError,
  generateSecret,
  getConfigSource,
  getConfigValue,
  isConfigWritable,
  maskMongoUri,
  maskSecret,
  updateConfig,
  validateMongoUriFormat,
} from "@/lib/config/platformConfig";

// Keys whose value is safe to show in full; everything else is masked
const PLAIN_KEYS: ConfigKey[] = ["resendFromEmail", "appUrl"];
// Removing these would take the platform down, so they can only be replaced
const REQUIRED_KEYS: ConfigKey[] = ["mongodbUri", "jwtSecret"];
const GENERATABLE_KEYS: ConfigKey[] = ["jwtSecret", "cronSecret"];

function describe(key: ConfigKey) {
  const value = getConfigValue(key);
  let display = "";
  if (value) {
    if (key === "mongodbUri") display = maskMongoUri(value);
    else if (PLAIN_KEYS.includes(key)) display = value;
    else display = maskSecret(value);
  }
  return { configured: !!value, source: getConfigSource(key), display };
}

function validate(key: ConfigKey, value: string): string | null {
  switch (key) {
    case "mongodbUri":
      return validateMongoUriFormat(value);
    case "jwtSecret":
    case "cronSecret":
      return value.length >= 32 ? null : "Secrets must be at least 32 characters (use Generate for a strong one)";
    case "resendApiKey":
      return value.startsWith("re_") ? null : "Resend API keys start with re_";
    case "resendFromEmail":
      return /^([^<>]+<)?[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+>?$/.test(value)
        ? null
        : 'Use an address like noreply@pos.mjawwadraza.com or "ForgePOS <noreply@pos.mjawwadraza.com>"';
    case "appUrl":
      return /^https?:\/\/[^\s/]+/.test(value) ? null : "Use a full URL like https://pos.mjawwadraza.com";
    default:
      return null;
  }
}

export async function GET() {
  const auth = await requireSuperAdminAction("manage_integrations");
  if (!auth.authorized) return auth.response;

  const items = Object.fromEntries(CONFIG_KEYS.map((key) => [key, describe(key)]));
  return NextResponse.json({ success: true, writable: isConfigWritable(), items });
}

/**
 * Body: {
 *   values?:   { [key]: string }  new values to save
 *   generate?: ["jwtSecret" | "cronSecret"]  replace with a freshly generated secret
 *   clear?:    [key]  remove the saved value (falls back to the environment variable)
 * }
 */
export async function PUT(req: Request) {
  const auth = await requireSuperAdminAction("manage_integrations");
  if (!auth.authorized) return auth.response;
  const session = auth.session;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const patch: Partial<Record<ConfigKey, string | null>> = {};

  const values = body?.values && typeof body.values === "object" ? body.values : {};
  for (const [key, raw] of Object.entries(values)) {
    if (!CONFIG_KEYS.includes(key as ConfigKey) || typeof raw !== "string") continue;
    const value = raw.trim();
    if (!value) continue;
    const error = validate(key as ConfigKey, key === "appUrl" ? value.replace(/\/+$/, "") : value);
    if (error) return NextResponse.json({ error, field: key }, { status: 400 });
    patch[key as ConfigKey] = key === "appUrl" ? value.replace(/\/+$/, "") : value;
  }

  for (const key of Array.isArray(body?.generate) ? body.generate : []) {
    if (GENERATABLE_KEYS.includes(key)) patch[key as ConfigKey] = generateSecret();
  }

  for (const key of Array.isArray(body?.clear) ? body.clear : []) {
    if (!CONFIG_KEYS.includes(key)) continue;
    if (REQUIRED_KEYS.includes(key)) {
      return NextResponse.json({ error: `${key} cannot be removed, only replaced`, field: key }, { status: 400 });
    }
    patch[key as ConfigKey] = null;
  }

  const changedKeys = Object.keys(patch) as ConfigKey[];
  if (changedKeys.length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  // Never switch to a database that cannot be reached
  const newMongoUri = patch.mongodbUri;
  let warning: string | undefined;
  if (newMongoUri && newMongoUri !== getConfigValue("mongodbUri")) {
    const test = await testMongoConnection(newMongoUri);
    if (!test.ok) {
      return NextResponse.json(
        { error: `Could not connect to the new database: ${test.error}`, field: "mongodbUri" },
        { status: 400 }
      );
    }
    if (!test.superAdminCount) {
      warning =
        "The new database has no super admin yet. You will be signed out — open /setup to create the first super admin there.";
    }
  } else {
    delete patch.mongodbUri;
  }

  // Record the change in the current database before any switch (values are never logged)
  await logAudit({
    organizationId: session.organizationId,
    actorId: session.userId,
    actorName: session.fullName || session.name || session.email,
    actorRole: session.role,
    action: "platform.integrations.update",
    targetCollection: "platform_config",
    after: { changedKeys: Object.keys(patch) },
    ipAddress: getClientIp(req),
  });

  try {
    updateConfig(patch);
  } catch (err) {
    if (err instanceof ConfigWriteError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }

  if (patch.mongodbUri) {
    await resetDbConnection();
  }

  const response = NextResponse.json({
    success: true,
    warning,
    // A generated cron secret is shown exactly once so it can be copied into the scheduler
    generatedCronSecret: body?.generate?.includes?.("cronSecret") ? patch.cronSecret : undefined,
    items: Object.fromEntries(CONFIG_KEYS.map((key) => [key, describe(key)])),
  });

  // A new JWT secret invalidates every session — re-issue the current admin's so they stay signed in
  if (patch.jwtSecret && !warning) {
    const { iat: _iat, exp: _exp, ...claims } = session as any;
    setSessionCookie(response, signToken(claims));
  }

  return response;
}
