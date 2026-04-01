import { getHealthReport } from "@/lib/health";
import type { ServiceCheck, ServiceStatus } from "@/lib/health";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "System Status — Quick Invoice",
  description: "Real-time system status for Quick Invoice services.",
  robots: { index: true, follow: true },
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

function statusColor(s: ServiceStatus): string {
  if (s === "healthy") return "#22c55e";
  if (s === "degraded") return "#f59e0b";
  return "#ef4444";
}

function statusLabel(s: ServiceStatus): string {
  if (s === "healthy") return "Operational";
  if (s === "degraded") return "Degraded";
  return "Outage";
}

function StatusDot({ status }: { status: ServiceStatus }) {
  const color = statusColor(status);
  return (
    <span
      style={{
        display: "inline-block",
        width: 10,
        height: 10,
        borderRadius: "50%",
        backgroundColor: color,
        marginRight: 8,
        flexShrink: 0,
      }}
      aria-hidden="true"
    />
  );
}

function ServiceRow({ check }: { check: ServiceCheck }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "14px 20px",
        borderBottom: "1px solid #f1f5f9",
      }}
    >
      <div style={{ display: "flex", alignItems: "center" }}>
        <StatusDot status={check.status} />
        <span style={{ fontWeight: 500, textTransform: "capitalize" }}>{check.name}</span>
        {check.message && (
          <span style={{ marginLeft: 12, fontSize: 13, color: "#64748b" }}>
            — {check.message}
          </span>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <span style={{ fontSize: 12, color: "#94a3b8" }}>{check.latencyMs}ms</span>
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: statusColor(check.status),
          }}
        >
          {statusLabel(check.status)}
        </span>
      </div>
    </div>
  );
}

export default async function StatusPage() {
  const report = await getHealthReport();

  const overallColor = statusColor(report.status);
  const overallLabel = statusLabel(report.status);

  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: "#f8fafc",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        color: "#1e293b",
      }}
    >
      {/* Header */}
      <div
        style={{
          backgroundColor: "#ffffff",
          borderBottom: "1px solid #e2e8f0",
          padding: "20px 24px",
        }}
      >
        <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 20, fontWeight: 700 }}>⚡ Quick Invoice</span>
            <span style={{ fontSize: 14, color: "#64748b" }}>System Status</span>
          </div>
          <a
            href="/"
            style={{
              fontSize: 13,
              color: "#6366f1",
              textDecoration: "none",
              fontWeight: 500,
            }}
          >
            ← Back to app
          </a>
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: "40px auto", padding: "0 24px" }}>
        {/* Overall status banner */}
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: 12,
            border: `2px solid ${overallColor}`,
            padding: "28px 24px",
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 32,
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
          }}
        >
          <StatusDot status={report.status} />
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: overallColor }}>
              All Systems {overallLabel}
            </div>
            <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
              Last checked: {new Date(report.timestamp).toLocaleString("en-US", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
              {" · "}Uptime: {Math.floor(report.uptime / 3600)}h {Math.floor((report.uptime % 3600) / 60)}m
            </div>
          </div>
        </div>

        {/* Service checks */}
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: 12,
            border: "1px solid #e2e8f0",
            overflow: "hidden",
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            marginBottom: 32,
          }}
        >
          <div
            style={{
              padding: "16px 20px",
              borderBottom: "1px solid #e2e8f0",
              backgroundColor: "#f8fafc",
            }}
          >
            <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Services
            </h2>
          </div>
          {report.checks.map((check) => (
            <ServiceRow key={check.name} check={check} />
          ))}
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center", fontSize: 12, color: "#94a3b8" }}>
          <p>
            Experiencing issues?{" "}
            <a href="mailto:support@quickinvoice.app" style={{ color: "#6366f1" }}>
              Contact support
            </a>
          </p>
          <p style={{ marginTop: 4 }}>
            Version {report.version} · © {new Date().getFullYear()} Quick Invoice
          </p>
        </div>
      </div>
    </main>
  );
}
