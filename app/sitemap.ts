export default function sitemap() { const u = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return ["", "/features", "/pricing", "/integrations", "/about", "/privacy", "/terms", "/cookies"].map(p => ({ url: u + p })); }
