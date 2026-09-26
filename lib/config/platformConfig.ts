import fs from "fs";
import path from "path";
import crypto from "crypto";

/**
 * Platform-wide runtime configuration (database URL, signing secrets, email provider keys).
 *
 * Values are managed by the super admin from the Integrations tab (or the first-run /setup wizard)
 * and stored in a server-side JSON file outside the database — the MongoDB URL cannot live inside
 * the database it points to, and the middleware needs the JWT secret without a DB round-trip.
 *
 * Resolution order for every key: saved file value -> environment variable -> unset.
 * Environment variables still work (e.g. on hosts with a read-only filesystem), but a value saved
 * from the dashboard always wins.
 */

export interface PlatformConfig {
  mongodbUri?: string;
  jwtSecret?: string;
  resendApiKey?: string;
  resendFromEmail?: string;
  appUrl?: string;
  cronSecret?: string;
}

export type ConfigKey = keyof PlatformConfig;
export type ConfigSource = "saved" | "env" | "unset";

export const CONFIG_KEYS: ConfigKey[] = [
  "mongodbUri",
  "jwtSecret",
  "resendApiKey",
  "resendFromEmail",
  "appUrl",
  "cronSecret",
];

const ENV_FALLBACK: Record<ConfigKey, string> = {
  mongodbUri: "MONGODB_URI",
  jwtSecret: "JWT_SECRET",
  resendApiKey: "RESEND_API_KEY",
  resendFromEmail: "RESEND_FROM_EMAIL",
  appUrl: "NEXT_PUBLIC_APP_URL",
  cronSecret: "CRON_SECRET",
};

export const CONFIG_FILE_PATH =
  process.env.PLATFORM_CONFIG_PATH || path.join(process.cwd(), ".data", "platform-config.json");

export class ConfigWriteError extends Error {}

// Re-read the file only when it changes, so every module instance (middleware, route handlers)
// sees dashboard edits immediately without hitting the disk on every call.
let cache: { stamp: string; data: PlatformConfig } | null = null;

function readConfigFile(): PlatformConfig {
  try {
    const stat = fs.statSync(CONFIG_FILE_PATH);
    const stamp = `${stat.mtimeMs}:${stat.size}`;
    if (cache && cache.stamp === stamp) return cache.data;

    const data = JSON.parse(fs.readFileSync(CONFIG_FILE_PATH, "utf8")) as PlatformConfig;
    cache = { stamp, data };
    return data;
  } catch (err: any) {
    if (err?.code !== "ENOENT") {
      console.error(`[Platform Config] Could not read ${CONFIG_FILE_PATH}:`, err?.message || err);
    }
    cache = null;
    return {};
  }
}

function writeConfigFile(data: PlatformConfig) {
  try {
    fs.mkdirSync(path.dirname(CONFIG_FILE_PATH), { recursive: true });
    // Write-then-rename so a crash mid-write never leaves a truncated config behind
    const tmpPath = `${CONFIG_FILE_PATH}.${process.pid}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), { encoding: "utf8", mode: 0o600 });
    fs.renameSync(tmpPath, CONFIG_FILE_PATH);
    cache = null;
  } catch (err: any) {
    throw new ConfigWriteError(
      err?.code === "EROFS" || err?.code === "EACCES" || err?.code === "EPERM"
        ? "This server's filesystem is read-only, so settings cannot be saved from the dashboard. " +
          "Set them as environment variables in your hosting provider instead."
        : `Could not save settings: ${err?.message || err}`
    );
  }
}

export function getConfigValue(key: ConfigKey): string | undefined {
  const saved = readConfigFile()[key]?.trim();
  if (saved) return saved;
  const fromEnv = process.env[ENV_FALLBACK[key]]?.trim();
  return fromEnv || undefined;
}

export function getConfigSource(key: ConfigKey): ConfigSource {
  if (readConfigFile()[key]?.trim()) return "saved";
  if (process.env[ENV_FALLBACK[key]]?.trim()) return "env";
  return "unset";
}

/** Applies a partial update. `null` or an empty string removes the saved value (env fallback applies again). */
export function updateConfig(patch: Partial<Record<ConfigKey, string | null>>) {
  const next: PlatformConfig = { ...readConfigFile() };
  for (const key of Object.keys(patch) as ConfigKey[]) {
    if (!CONFIG_KEYS.includes(key)) continue;
    const value = patch[key]?.trim();
    if (value) next[key] = value;
    else delete next[key];
  }
  writeConfigFile(next);
}

export function isConfigWritable(): boolean {
  try {
    const dir = path.dirname(CONFIG_FILE_PATH);
    fs.mkdirSync(dir, { recursive: true });
    fs.accessSync(dir, fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

export function isDatabaseConfigured(): boolean {
  return !!getConfigValue("mongodbUri");
}

export function generateSecret(bytes = 48): string {
  return crypto.randomBytes(bytes).toString("hex");
}

/**
 * Returns the JWT signing secret. On first use it is generated and saved automatically,
 * so a fresh install never runs with a missing or default secret.
 */
export function getJwtSecret(): string {
  const existing = getConfigValue("jwtSecret");
  if (existing) return existing;

  const secret = generateSecret();
  updateConfig({ jwtSecret: secret });
  console.warn("[Platform Config] No JWT secret was configured — generated and saved a new one.");
  return secret;
}

/** Hides everything but the first and last few characters of a secret. */
export function maskSecret(value?: string): string {
  if (!value) return "";
  if (value.length <= 12) return "••••••••";
  return `${value.slice(0, 4)}••••••••${value.slice(-4)}`;
}

/** Shows a MongoDB URL with its password hidden. */
export function maskMongoUri(uri?: string): string {
  if (!uri) return "";
  return uri.replace(/^(mongodb(?:\+srv)?:\/\/[^:/@]+):[^@]*@/, "$1:••••••••@");
}

/** Database name from a MongoDB URL path, or undefined when the URL has none (driver would use "test"). */
export function mongoDbNameFromUri(uri: string): string | undefined {
  const match = uri.match(/^mongodb(?:\+srv)?:\/\/[^/]+\/([^/?]+)/);
  return match ? decodeURIComponent(match[1]) : undefined;
}

/** Returns an error message for a malformed MongoDB URL, or null when it looks usable. */
export function validateMongoUriFormat(uri: string): string | null {
  if (!/^mongodb(\+srv)?:\/\//.test(uri)) {
    return "The URL must start with mongodb+srv:// or mongodb://";
  }
  if (uri.includes("<") || uri.includes(">")) {
    return "Replace the <db_password> placeholder (including the < > brackets) with your real password";
  }
  if (!mongoDbNameFromUri(uri)) {
    return "Add a database name after the host, e.g. ...mongodb.net/masterpos?retryWrites=true";
  }
  return null;
}
