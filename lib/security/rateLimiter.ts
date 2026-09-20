interface RateLimitRecord {
  count: number;
  firstAttemptTime: number;
}

const rateLimitMap = new Map<string, RateLimitRecord>();

/**
  Sliding window rate limiter
  @param key Unique identifier (e.g. IP + endpoint)
  @param maxAttempts Maximum allowed attempts within window
  @param windowMs Time window in milliseconds
 */
export function checkRateLimit(
  key: string,
  maxAttempts: number = 5,
  windowMs: number = 15 * 60 * 1000 // 15 minutes default
): { success: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const record = rateLimitMap.get(key);

  if (!record) {
    rateLimitMap.set(key, { count: 1, firstAttemptTime: now });
    return { success: true, remaining: maxAttempts - 1, resetTime: now + windowMs };
  }

  // If window expired, reset counter
  if (now - record.firstAttemptTime > windowMs) {
    rateLimitMap.set(key, { count: 1, firstAttemptTime: now });
    return { success: true, remaining: maxAttempts - 1, resetTime: now + windowMs };
  }

  // If limit exceeded
  if (record.count >= maxAttempts) {
    return {
      success: false,
      remaining: 0,
      resetTime: record.firstAttemptTime + windowMs,
    };
  }

  // Increment count
  record.count += 1;
  rateLimitMap.set(key, record);

  return {
    success: true,
    remaining: maxAttempts - record.count,
    resetTime: record.firstAttemptTime + windowMs,
  };
}
