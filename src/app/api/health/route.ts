import { NextResponse } from "next/server";
import { getHealthReport } from "@/lib/health";
import { logger } from "@/lib/logger";

// Do not cache health responses
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const report = await getHealthReport();

    const httpStatus =
      report.status === "healthy"
        ? 200
        : report.status === "degraded"
          ? 200
          : 503;

    if (report.status !== "healthy") {
      logger.warn("Health check degraded/unhealthy", { status: report.status, checks: report.checks });
    }

    return NextResponse.json(report, {
      status: httpStatus,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "X-Health-Status": report.status,
      },
    });
  } catch (err) {
    logger.error("Health check threw unexpectedly", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        message: "Health check failed",
      },
      { status: 503 }
    );
  }
}
