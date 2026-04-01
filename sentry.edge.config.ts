import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  release: process.env.NEXT_PUBLIC_APP_VERSION ?? "0.1.0",

  // Keep edge sampling low — edge functions fire frequently
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.05 : 1.0,
});
