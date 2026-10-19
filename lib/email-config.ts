// Which email service is in use, decided only from environment variables (no database, so it is easy to test).
// Free options: Brevo (HTTP API, 300 emails/day, no domain needed to start), Resend (HTTP API, needs your own domain to email other people), or any SMTP server.
export type Provider = "brevo" | "resend" | "smtp";
const env = (k: string) => process.env[k]?.trim() || "";
export function emailProvider(): Provider | null {
  const has = (p: Provider) => !!env("EMAIL_FROM") && !!env(p === "brevo" ? "BREVO_API_KEY" : p === "resend" ? "RESEND_API_KEY" : "EMAIL_SERVER");
  const want = env("EMAIL_PROVIDER").toLowerCase();
  if (want === "brevo" || want === "resend" || want === "smtp") return has(want) ? want : null; // an explicit choice is never silently replaced
  return (["brevo", "resend", "smtp"] as const).find(has) ?? null;
}
// "Vyoma Route <no-reply@example.com>" or just "no-reply@example.com"
export function parseFrom(v: string): { name: string; email: string } {
  const m = /^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/.exec(v); return m ? { name: m[1].trim() || "Vyoma Route", email: m[2].trim() } : { name: "Vyoma Route", email: v.trim() };
}
