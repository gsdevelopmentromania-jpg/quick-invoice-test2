# Monitoring & Error Tracking Setup

_Quick Invoice — Pre-Launch Hardening | Phase: Monitoring_

---

## Overview

This document covers the full monitoring stack for Quick Invoice:

| Layer | Tool | Purpose |
|-------|------|---------|
| Error tracking | Sentry | Capture, group & alert on runtime errors |
| Uptime monitoring | BetterUptime / UptimeRobot | External ping checks + status page |
| Performance | Sentry Tracing + custom logger | Slow query & request alerts |
| Log aggregation | Structured JSON → Logtail / Axiom | Searchable, queryable logs |
| Alerting | Sentry + BetterUptime | Slack/email alerts |
| Health endpoint | `/api/health` | Internal liveness/readiness probe |
| Status page | `/status` | Public-facing service status |

---

## 1. Error Tracking — Sentry

### Install

```bash
npm install @sentry/nextjs
```

### Create Sentry Project

1. Go to [sentry.io](https://sentry.io) → **New Project** → **Next.js**
2. Copy the **DSN** from Project Settings → Client Keys
3. Go to Account Settings → API Auth Tokens → create a token with `project:releases` scope

### Configure Environment Variables

```env
NEXT_PUBLIC_SENTRY_DSN=https://xxx@oxx.ingest.sentry.io/xxx
SENTRY_AUTH_TOKEN=sntrys_...
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=quick-invoice
```

### Files Added

| File | Purpose |
|------|---------|
| `sentry.client.config.ts` | Browser error + replay capture |
| `sentry.server.config.ts` | Server-side errors + Prisma tracing |
| `sentry.edge.config.ts` | Edge runtime errors |
| `instrumentation.ts` | Next.js 14 instrumentation hook |
| `next.config.mjs` | Sentry webpack plugin (source maps) |

### Alert Rules (configure in Sentry UI)

1. **New issue** → Slack `#errors` + email
2. **Issue regression** → Slack `#errors`
3. **Error rate spike** (>10 events/min) → PagerDuty / email
4. **Performance regression** (p95 >2s) → Slack `#perf`

---

## 2. Uptime Monitoring — BetterUptime (recommended)

### Setup

1. Sign up at [betteruptime.com](https://betteruptime.com)
2. **New Monitor** → HTTP(s):
   - URL: `https://yourdomain.com/api/health`
   - Check interval: **1 minute**
   - Expected HTTP status: `200` or `200-299`
   - Request timeout: `10s`
3. **Alert Policy**:
   - After **2 consecutive failures** → send alert
   - Channels: email + Slack
4. **Status Page** (optional):
   - Create a public status page at `status.yourdomain.com`
   - Add monitors for: App, Database, Email, Payments

### Alternative — UptimeRobot (free tier)

1. Sign up at [uptimerobot.com](https://uptimerobot.com)
2. Add HTTP monitor → `https://yourdomain.com/api/health`
3. Interval: 5 minutes (free) or 1 minute (paid)
4. Notifications: email + Slack webhook

### Healthcheck endpoint response

`GET /api/health` returns:

```json
{
  "status": "healthy",
  "timestamp": "2026-04-01T06:00:00.000Z",
  "version": "0.1.0",
  "uptime": 3600,
  "checks": [
    { "name": "database", "status": "healthy", "latencyMs": 12 },
    { "name": "stripe",   "status": "healthy", "latencyMs": 0  },
    { "name": "email",    "status": "healthy", "latencyMs": 0  }
  ]
}
```

HTTP status codes:
- `200` — healthy or degraded (app is up, some services may be slow)
- `503` — unhealthy (critical service down, e.g. database unreachable)

---

## 3. Performance Monitoring

### Sentry Tracing

Configured in `sentry.server.config.ts`:
- `tracesSampleRate: 0.1` in production (10% of transactions)
- Prisma integration enabled — slow queries appear in Sentry Performance tab

### Custom Thresholds (env vars)

```env
SLOW_REQUEST_THRESHOLD_MS=2000   # warns in logs
ALERT_THRESHOLD_MS=5000          # errors in logs (triggers alert)
```

### Using `withMetrics` wrapper (optional)

```typescript
import { withMetrics } from "@/lib/monitoring";

export const GET = withMetrics("GET /api/invoices", async (req) => {
  // ... your handler
});
```

---

## 4. Log Aggregation

All logs are emitted as structured JSON via `src/lib/logger.ts`:

```json
{
  "timestamp": "2026-04-01T06:00:00.000Z",
  "level": "info",
  "message": "Invoice created",
  "service": "quick-invoice",
  "environment": "production",
  "userId": "usr_123",
  "invoiceId": "inv_456",
  "durationMs": 45
}
```

### Recommended: Logtail (BetterStack)

1. Sign up at [logs.betterstack.com](https://logs.betterstack.com)
2. Create a **Source** → copy the **Source Token**
3. In Vercel/Railway: pipe stdout to Logtail drain
4. Or install the Logtail transport:

```bash
npm install @logtail/node @logtail/next
```

Then update `src/lib/logger.ts` to use the Logtail transport in production.

### Alternative: Axiom

1. Sign up at [axiom.co](https://axiom.co)
2. Install `next-axiom` and wrap your Next.js config
3. All `console.log` calls are automatically forwarded

### Vercel Log Drains

If deploying to Vercel:

```bash
vercel log-drains add --url https://in.logtail.com --type json
```

---

## 5. Alerting

### Slack Integration

**Sentry → Slack:**
1. Sentry → Settings → Integrations → Slack → Connect
2. Create alert rules in Sentry → Alerts → Create Alert Rule
3. Action: **Send a notification via Slack** → `#errors`

**BetterUptime → Slack:**
1. BetterUptime → Integrations → Slack → Connect
2. Select channel `#infrastructure`

### Email Alerts

All Sentry alert rules support email notifications. Configure in:
- Sentry → Settings → Notifications → Default email

### PagerDuty (for critical incidents)

1. Create a service in PagerDuty
2. Copy the Integration Key
3. Sentry → Integrations → PagerDuty → connect
4. Create an alert rule: error rate >50/min → trigger PagerDuty

---

## 6. Status Page

### Built-in (`/status`)

The app ships with a status page at `/status` that:
- Shows real-time service health (DB, Stripe, Email)
- Refreshes on every load (no caching)
- Links back to the main app

### External (BetterUptime)

For a production-grade public status page:
1. BetterUptime → Status Pages → New
2. Add your monitors
3. Custom domain: `status.quickinvoice.app` (CNAME to BetterUptime)
4. Enable **incident management** for public communications

---

## 7. CI Source Map Uploads

Source maps are uploaded automatically during `next build` when:
- `SENTRY_AUTH_TOKEN` is set
- `SENTRY_ORG` and `SENTRY_PROJECT` are set
- The build runs in CI (`CI=true`)

Add these secrets to your CI environment (GitHub Actions / Vercel):

```
NEXT_PUBLIC_SENTRY_DSN
SENTRY_AUTH_TOKEN
SENTRY_ORG
SENTRY_PROJECT
```

---

## Checklist

- [ ] Create Sentry project and add `NEXT_PUBLIC_SENTRY_DSN`
- [ ] Add `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` to CI
- [ ] Set up BetterUptime monitor on `/api/health`
- [ ] Configure Sentry → Slack alert rules
- [ ] Set up BetterUptime public status page
- [ ] Configure Logtail / Axiom log drain
- [ ] Test `/api/health` endpoint
- [ ] Test `/status` page
- [ ] Verify source maps upload on production build
- [ ] Set `LOG_LEVEL=warn` in production (reduce noise)
