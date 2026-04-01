/**
 * Structured JSON logger for Quick Invoice.
 * Outputs log lines consumable by log aggregation platforms (Datadog, Logtail, Axiom, etc.)
 * Zero runtime dependencies — uses console internally.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  service: string;
  environment: string;
  [key: string]: unknown;
}

const SERVICE_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "quick-invoice";
const ENVIRONMENT = process.env.NODE_ENV ?? "development";
const LOG_LEVEL = (process.env.LOG_LEVEL ?? "info") as LogLevel;

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function shouldLog(level: LogLevel): boolean {
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[LOG_LEVEL];
}

function buildEntry(level: LogLevel, message: string, context?: LogContext): LogEntry {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    service: SERVICE_NAME,
    environment: ENVIRONMENT,
  };
  if (context) {
    const keys = Object.keys(context);
    for (let i = 0; i < keys.length; i++) {
      entry[keys[i]] = context[keys[i]];
    }
  }
  return entry;
}

function write(level: LogLevel, message: string, context?: LogContext): void {
  if (!shouldLog(level)) return;
  const entry = buildEntry(level, message, context);
  const line = JSON.stringify(entry);
  switch (level) {
    case "debug":
    case "info":
      console.log(line);
      break;
    case "warn":
      console.warn(line);
      break;
    case "error":
      console.error(line);
      break;
  }
}

export const logger = {
  debug: (message: string, context?: LogContext) => write("debug", message, context),
  info: (message: string, context?: LogContext) => write("info", message, context),
  warn: (message: string, context?: LogContext) => write("warn", message, context),
  error: (message: string, context?: LogContext) => write("error", message, context),

  /** Wrap an async function and log duration + outcome */
  timed: async <T>(
    label: string,
    fn: () => Promise<T>,
    context?: LogContext
  ): Promise<T> => {
    const start = Date.now();
    try {
      const result = await fn();
      const durationMs = Date.now() - start;
      write("info", label, { ...context, durationMs, status: "ok" });
      return result;
    } catch (err) {
      const durationMs = Date.now() - start;
      write("error", label, {
        ...context,
        durationMs,
        status: "error",
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  },
};

export default logger;
