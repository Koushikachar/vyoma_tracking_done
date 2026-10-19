import { NextRequest, NextResponse } from "next/server";
// 1) Hides the private admin path unless it matches ADMIN_ROUTE_SECRET (obscurity only; real security is password + TOTP + RBAC on every API).
// 2) Sets a per-request nonce CSP. Set CSP_REPORT_ONLY=1 to trial it without enforcing.
export function middleware(req: NextRequest) {
  const p = req.nextUrl.pathname; const admin = p.startsWith("/control/");
  if (admin && (!process.env.ADMIN_ROUTE_SECRET || p.split("/")[2] !== process.env.ADMIN_ROUTE_SECRET)) return new NextResponse(null, { status: 404 });
  const nonce = btoa(crypto.randomUUID()); const dev = process.env.NODE_ENV === "development";
  const csp = ["default-src 'self'", `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://challenges.cloudflare.com${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'", // inline style attributes from animation libs; scripts stay nonce-only
    "img-src 'self' data: blob:", "font-src 'self'",
    `connect-src 'self' https://*.ingest.sentry.io https://*.ingest.us.sentry.io https://*.ingest.de.sentry.io https://challenges.cloudflare.com${dev ? " ws://localhost:* ws://127.0.0.1:*" : ""}`,
    "frame-src https://challenges.cloudflare.com", "object-src 'none'", "base-uri 'self'", "form-action 'self'", "frame-ancestors 'none'", ...(dev ? [] : ["upgrade-insecure-requests"])].join("; ");
  const name = process.env.CSP_REPORT_ONLY === "1" ? "Content-Security-Policy-Report-Only" : "Content-Security-Policy";
  const h = new Headers(req.headers); h.set("x-nonce", nonce); h.set(name, csp);
  const res = NextResponse.next({ request: { headers: h } }); res.headers.set(name, csp);
  if (admin) { res.headers.set("X-Robots-Tag", "noindex, nofollow"); res.headers.set("Cache-Control", "no-store"); }
  return res;
}
export const config = { matcher: ["/((?!api|_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest).*)"] };
