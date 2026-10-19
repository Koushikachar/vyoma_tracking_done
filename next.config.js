// Sentry is optional at config time: if the wrapper can't be resolved (Console Ninja / Turbopack loaders sometimes load the
// browser build of @sentry/nextjs, which has no withSentryConfig), the app still starts, just without source-map upload.
let withSentryConfig = (c) => c;
for (const id of ["@sentry/nextjs", "@sentry/nextjs/build/cjs/config/index.js"]) {
  try { const m = require(id); if (typeof m?.withSentryConfig === "function") { withSentryConfig = m.withSentryConfig; break; } } catch {}
}
const headers = [
  { key: "X-Content-Type-Options", value: "nosniff" }, { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" }, { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];
const config = { async headers() { return [{ source: "/(.*)", headers }]; }, async rewrites() { return [{ source: "/favicon.ico", destination: "/icon.svg" }]; } }; // browsers ask for /favicon.ico; serve the SVG icon instead of a 404 // CSP is set per request in middleware.ts
module.exports = withSentryConfig(config, { silent: true, org: process.env.SENTRY_ORG, project: process.env.SENTRY_PROJECT, sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN } });
