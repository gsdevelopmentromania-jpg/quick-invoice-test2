/**
 * Simple sliding-window in-memory rate limiter.
 *
 * Suitable for single-instance deployments (dev, hobby tier).
 * For multi-instance / serverless production, replace the Map store
 * with Redis (e.g. Upstash) using the same interface.
 */

interface RateLimitEntry {
  count: number;
  resetTime: number; // epoch ms
}

const store = new Map<string, RateLimitEntry>();

export interface RateLimitResult {
  /** Whether the request is allowed. */
  success: boolean;
  /** Remaining requests in this window. */
  remaining: number;
  /** Seconds until the window resets. */
  resetIn: number;
}

/**
 * Check (and increment) the rate limit for a given identifier.
 *
 * @param identifier  Unique key, e.g. `"login:user@example.com"` or `"signup:1.2.3.4"`
 * @param limit       Max requests allowed in the window
 * @param windowSeconds  Window size in seconds
 */
export function checkRateLimit(
  identifier: string,
  limit: number,
  windowSeconds: number
): RateLimitResult {
  const now = Date.now();
  const entry = store.get(identifier);

  if (!entry || now >= entry.resetTime) {
    store.set(identifier, { count: 1, resetTime: now + windowSeconds * 1000 });
    return { success: true, remaining: limit - 1, resetIn: windowSeconds };
  }

  if (entry.count >= limit) {
    return {
      success: false,
      remaining: 0,
      resetIn: Math.ceil((entry.resetTime - now) / 1000),
    };
  }

  entry.count += 1;
  return {
    success: true,
    remaining: limit - entry.count,
    resetIn: Math.ceil((entry.resetTime - now) / 1000),
  };
}

/** Extract the best available client IP from request headers. */
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return headers.get("x-real-ip") ?? "unknown";
}
