export default function robots() { const u = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return { rules: { userAgent: "*", allow: "/", disallow: ["/control/", "/api/", "/track/"] }, sitemap: `${u}/sitemap.xml` }; }
