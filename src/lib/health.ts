import prisma from "@/lib/prisma";

export type ServiceStatus = "healthy" | "degraded" | "unhealthy";

export interface ServiceCheck {
  name: string;
  status: ServiceStatus;
  latencyMs: number;
  message?: string;
}

export interface HealthReport {
  status: ServiceStatus;
  timestamp: string;
  version: string;
  uptime: number;
  checks: ServiceCheck[];
}

async function checkDatabase(): Promise<ServiceCheck> {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return {
      name: "database",
      status: "healthy",
      latencyMs: Date.now() - start,
    };
  } catch (err) {
    return {
      name: "database",
      status: "unhealthy",
      latencyMs: Date.now() - start,
      message: err instanceof Error ? err.message : "Database unreachable",
    };
  }
}

async function checkStripe(): Promise<ServiceCheck> {
  const start = Date.now();
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    return {
      name: "stripe",
      status: "degraded",
      latencyMs: 0,
      message: "STRIPE_SECRET_KEY not configured",
    };
  }
  // Validate key format only — avoid external HTTP calls in health check
  const isValidFormat = key.startsWith("sk_live_") || key.startsWith("sk_test_");
  return {
    name: "stripe",
    status: isValidFormat ? "healthy" : "degraded",
    latencyMs: Date.now() - start,
    message: isValidFormat ? undefined : "Invalid key format",
  };
}

async function checkEmail(): Promise<ServiceCheck> {
  const start = Date.now();
  const key = process.env.RESEND_API_KEY;
  return {
    name: "email",
    status: key ? "healthy" : "degraded",
    latencyMs: Date.now() - start,
    message: key ? undefined : "RESEND_API_KEY not configured",
  };
}

function rollupStatus(checks: ServiceCheck[]): ServiceStatus {
  const hasUnhealthy = checks.some((c) => c.status === "unhealthy");
  const hasDegraded = checks.some((c) => c.status === "degraded");
  if (hasUnhealthy) return "unhealthy";
  if (hasDegraded) return "degraded";
  return "healthy";
}

export async function getHealthReport(): Promise<HealthReport> {
  const [db, stripe, email] = await Promise.all([
    checkDatabase(),
    checkStripe(),
    checkEmail(),
  ]);

  const checks: ServiceCheck[] = [db, stripe, email];
  const status = rollupStatus(checks);

  return {
    status,
    timestamp: new Date().toISOString(),
    version: process.env.NEXT_PUBLIC_APP_VERSION ?? "0.1.0",
    uptime: process.uptime(),
    checks,
  };
}
