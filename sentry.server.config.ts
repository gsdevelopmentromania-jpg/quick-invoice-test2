import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  release: process.env.NEXT_PUBLIC_APP_VERSION ?? "0.1.0",

  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Capture slow DB queries (>1s threshold)
  integrations: [
    Sentry.prismaIntegration(),
  ],

  beforeSend(event) {
    // Scrub sensitive fields from server-side events
    if (event.request) {
      if (event.request.headers) {
        const headers = event.request.headers as Record<string, string>;
        delete headers["authorization"];
        delete headers["cookie"];
        delete headers["x-api-key"];
      }
      // Never capture request body on server (may contain PII)
      delete event.request.data;
    }
    return event;
  },
});
