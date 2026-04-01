/**
 * Performance monitoring utilities for Quick Invoice.
 * Used to track slow API routes and trigger alerts.
 */

import { logger } from "@/lib/logger";

/** Threshold in ms above which a request is flagged as slow */
const SLOW_REQUEST_THRESHOLD_MS = parseInt(
  process.env.SLOW_REQUEST_THRESHOLD_MS ?? "2000",
  10
);

/** Threshold in ms above which an alert is sent */
const ALERT_THRESHOLD_MS = parseInt(
  process.env.ALERT_THRESHOLD_MS ?? "5000",
  10
);

export interface RequestMetrics {
  path: string;
  method: string;
  statusCode: number;
  durationMs: number;
  userId?: string;
}

/**
 * Record API request metrics. Logs warnings for slow requests
 * and errors for critically slow requests that may trigger alerts.
 */
export function recordRequestMetrics(metrics: RequestMetrics): void {
  const { path, method, statusCode, durationMs, userId } = metrics;
  const ctx = { path, method, statusCode, durationMs, userId };

  if (durationMs >= ALERT_THRESHOLD_MS) {
    logger.error("CRITICAL: API response extremely slow — alert threshold exceeded", ctx);
  } else if (durationMs >= SLOW_REQUEST_THRESHOLD_MS) {
    logger.warn("Slow API response detected", ctx);
  } else {
    logger.debug("API request completed", ctx);
  }
}

/**
 * Wrap a route handler with automatic timing and metric recording.
 *
 * Usage:
 *   export const GET = withMetrics("GET /api/invoices", async (req) => { ... });
 */
export function withMetrics<TArgs extends unknown[], TReturn>(
  label: string,
  handler: (...args: TArgs) => Promise<TReturn>
): (...args: TArgs) => Promise<TReturn> {
  return async (...args: TArgs): Promise<TReturn> => {
    const start = Date.now();
    let statusCode = 200;
    try {
      const result = await handler(...args);
      // Attempt to read status from NextResponse-like objects
      if (result && typeof result === "object" && "status" in result) {
        const s = (result as { status?: unknown }).status;
        if (typeof s === "number") statusCode = s;
      }
      return result;
    } catch (err) {
      statusCode = 500;
      throw err;
    } finally {
      recordRequestMetrics({
        path: label,
        method: label.split(" ")[0] ?? "UNKNOWN",
        statusCode,
        durationMs: Date.now() - start,
      });
    }
  };
}

/**
 * Simple in-process error rate tracker (resets on each deploy).
 * For production use, pipe logs to a proper aggregation backend.
 */
class ErrorRateTracker {
  private windowMs: number;
  private maxErrors: number;
  private timestamps: number[];

  constructor(windowMs = 60_000, maxErrors = 50) {
    this.windowMs = windowMs;
    this.maxErrors = maxErrors;
    this.timestamps = [];
  }

  record(): boolean {
    const now = Date.now();
    const cutoff = now - this.windowMs;
    // Evict old entries
    this.timestamps = this.timestamps.filter((t) => t > cutoff);
    this.timestamps.push(now);
    const exceeded = this.timestamps.length > this.maxErrors;
    if (exceeded) {
      logger.error("Error rate threshold exceeded", {
        errorsInWindow: this.timestamps.length,
        windowMs: this.windowMs,
      });
    }
    return exceeded;
  }

  getRate(): number {
    const now = Date.now();
    const cutoff = now - this.windowMs;
    return this.timestamps.filter((t) => t > cutoff).length;
  }
}

export const errorRateTracker = new ErrorRateTracker();
