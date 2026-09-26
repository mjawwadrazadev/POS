import mongoose from "mongoose";
import { getConfigValue } from "@/lib/config/platformConfig";

/** Thrown when no MongoDB URL has been set yet — the app sends visitors to /setup in that case. */
export class DatabaseNotConfiguredError extends Error {
  constructor() {
    super("MongoDB is not configured yet. Open /setup (first run) or the super admin Integrations tab.");
  }
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
  uri: string | null;
}

declare global {
  var mongooseCache: MongooseCache;
}

let cached = global.mongooseCache;

if (!cached) {
  cached = global.mongooseCache = { conn: null, promise: null, uri: null };
}

export async function dbConnect() {
  const uri = getConfigValue("mongodbUri");
  if (!uri) throw new DatabaseNotConfiguredError();

  // The super admin switched databases from the Integrations tab — drop the old connection
  if (cached.uri && cached.uri !== uri) {
    await resetDbConnection();
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.uri = uri;
    cached.promise = mongoose.connect(uri, opts).then((m) => {
      return m;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    cached.uri = null;
    throw e;
  }

  return cached.conn;
}

export async function resetDbConnection() {
  cached.conn = null;
  cached.promise = null;
  cached.uri = null;
  await mongoose.disconnect().catch(() => {});
}

/** Opens a throwaway connection to check a URL before it is saved. Never touches the shared connection. */
export async function testMongoConnection(
  uri: string
): Promise<{ ok: boolean; dbName?: string; superAdminCount?: number; error?: string }> {
  let conn: mongoose.Connection | null = null;
  try {
    conn = mongoose.createConnection(uri, { serverSelectionTimeoutMS: 8000 });
    await conn.asPromise();
    await conn.db!.admin().ping();
    // Tells the caller whether switching to this database would leave the platform without a super admin
    const superAdminCount = await conn.db!.collection("users").countDocuments({ role: "super_admin" });
    return { ok: true, dbName: conn.name, superAdminCount };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Connection failed" };
  } finally {
    await conn?.close().catch(() => {});
  }
}
