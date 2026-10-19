import * as Sentry from "@sentry/nextjs";
if (process.env.NEXT_PUBLIC_SENTRY_DSN) Sentry.init({ dsn: process.env.NEXT_PUBLIC_SENTRY_DSN, sendDefaultPii: false, tracesSampleRate: 0.05, environment: process.env.NODE_ENV,
  beforeSend(e) { if (e.request) { delete e.request.cookies; delete e.request.headers; delete e.request.data; } return e; } });
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
