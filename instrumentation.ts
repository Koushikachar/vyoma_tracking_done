export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.SENTRY_DSN) {
    const S = await import("@sentry/nextjs");
    S.init({ dsn: process.env.SENTRY_DSN, environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV, sendDefaultPii: false, tracesSampleRate: 0.1,
      beforeSend(e) { if (e.request) { delete e.request.headers; delete e.request.cookies; delete e.request.data; delete e.request.query_string; } return e; } }); // no tokens/cookies/payloads
  }
}
