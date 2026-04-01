import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  release: process.env.NEXT_PUBLIC_APP_VERSION ?? "0.1.0",

  // Capture 10% of sessions for performance monitoring in production
  // Increase to 1.0 in development/staging
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Capture 100% of sessions for session replays on errors
  replaysOnErrorSampleRate: 1.0,

  // Capture 1% of sessions for general replays
  replaysSessionSampleRate: 0.01,

  integrations: [
    Sentry.replayIntegration({
      // Mask all text and block all media to protect user privacy
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // Filter out low-signal errors
  beforeSend(event) {
    // Drop cancelled network requests
    if (event.exception) {
      const values = event.exception.values;
      if (values) {
        const isNetworkCancel = values.some(
          (v) =>
            v.type === "AbortError" ||
            (v.value != null && v.value.includes("The user aborted a request"))
        );
        if (isNetworkCancel) return null;
      }
    }
    return event;
  },
});
