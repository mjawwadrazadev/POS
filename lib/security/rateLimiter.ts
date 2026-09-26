import { dbConnect } from "@/lib/db/mongoose";
import { RateLimitRecord } from "@/models/RateLimitRecord";

/**
 * MongoDB-backed fixed-window rate limiter.
 * Shared across server instances and survives restarts (unlike an in-memory Map).
 *
 * Usage: call `checkRateLimit` before an attempt, `recordFailedAttempt` only when the attempt fails,
 * and `clearRateLimit` after a successful attempt — successful logins never count against the limit.
 */
export async function checkRateLimit(
  key: string,
  maxAttempts: number = 5,
  windowMs: number = 15 * 60 * 1000
): Promise<{ success: boolean; remaining: number; resetTime: number }> {
  await dbConnect();
  const now = Date.now();
  const record = await RateLimitRecord.findOne({ key }).lean();

  if (!record || record.windowStart.getTime() + windowMs <= now) {
    return { success: true, remaining: maxAttempts, resetTime: now + windowMs };
  }

  const resetTime = record.windowStart.getTime() + windowMs;
  if (record.count >= maxAttempts) {
    return { success: false, remaining: 0, resetTime };
  }

  return { success: true, remaining: maxAttempts - record.count, resetTime };
}

export async function recordFailedAttempt(key: string, windowMs: number = 15 * 60 * 1000): Promise<void> {
  await dbConnect();
  const now = new Date();

  // Drop a stale window first (the TTL monitor only runs about once a minute)
  await RateLimitRecord.deleteOne({ key, expiresAt: { $lte: now } });

  await RateLimitRecord.findOneAndUpdate(
    { key },
    {
      $inc: { count: 1 },
      $setOnInsert: { windowStart: now, expiresAt: new Date(now.getTime() + windowMs) },
    },
    { upsert: true }
  );
}

export async function clearRateLimit(key: string): Promise<void> {
  await dbConnect();
  await RateLimitRecord.deleteOne({ key });
}
