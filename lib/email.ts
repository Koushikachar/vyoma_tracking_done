import { getSettings } from "@/lib/settings";
import { emailProvider, parseFrom } from "@/lib/email-config";
export { emailProvider } from "@/lib/email-config";
export type Mail = { to: string; subject: string; text: string; html?: string; replyTo?: string };
// One place that actually sends mail. Picks Brevo, Resend or SMTP from the environment (see lib/email-config.ts). Errors never contain secrets.
async function deliver(m: Mail) {
  const p = emailProvider(); const from = parseFrom(process.env.EMAIL_FROM ?? "");
  if (p === "brevo") {
    const r = await fetch("https://api.brevo.com/v3/smtp/email", { method: "POST", signal: AbortSignal.timeout(12_000), headers: { "api-key": process.env.BREVO_API_KEY!.trim(), "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ sender: { name: from.name, email: from.email }, to: [{ email: m.to }], subject: m.subject, textContent: m.text, ...(m.html ? { htmlContent: m.html } : {}), ...(m.replyTo ? { replyTo: { email: m.replyTo } } : {}) }) });
    if (!r.ok) throw new Error(`Brevo ${r.status}: ${(await r.text().catch(() => "")).slice(0, 160)}`); return;
  }
  if (p === "resend") {
    const r = await fetch("https://api.resend.com/emails", { method: "POST", signal: AbortSignal.timeout(12_000), headers: { authorization: `Bearer ${process.env.RESEND_API_KEY!.trim()}`, "content-type": "application/json" },
      body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [m.to], subject: m.subject, text: m.text, ...(m.html ? { html: m.html } : {}), ...(m.replyTo ? { reply_to: m.replyTo } : {}) }) });
    if (!r.ok) throw new Error(`Resend ${r.status}: ${(await r.text().catch(() => "")).slice(0, 160)}`); return;
  }
  if (p === "smtp") { const nm = (await import("nodemailer")).default; await nm.createTransport(process.env.EMAIL_SERVER!).sendMail({ from: process.env.EMAIL_FROM, to: m.to, subject: m.subject, text: m.text, html: m.html, replyTo: m.replyTo }); return; }
  throw new Error("Email is not configured. Set EMAIL_FROM plus BREVO_API_KEY, RESEND_API_KEY or EMAIL_SERVER.");
}
// Contact-form notification to the site owner. Best-effort: failures are swallowed and message content is never logged.
export async function notifyAdmin(name: string, email: string, company: string | undefined, message: string) {
  const to = (await getSettings()).notifyEmail || process.env.ADMIN_NOTIFY_EMAIL; if (!emailProvider() || !to) return;
  const clean = (x: string) => x.replace(/[\r\n]+/g, " ").slice(0, 80);
  try { await deliver({ to, replyTo: email, subject: `New VYOMA ROUTE contact: ${clean(name)}`, text: `From: ${clean(name)} <${email}>${company ? `\nCompany: ${clean(company)}` : ""}\n\n${message}` }); } catch { console.error("contact notification failed"); }
}
export async function sendAdminEmail(subject: string, text: string) {
  const to = (await getSettings()).notifyEmail || process.env.ADMIN_NOTIFY_EMAIL; if (!emailProvider() || !to) return false;
  try { await deliver({ to, subject, text }); return true; } catch { return false; }
}
// Transactional mail for sellers (verification / password reset / invitations). In development with nothing configured the message is
// printed to the server console so you can click the link locally. In production a missing set-up is an error, never silently dropped.
export async function sendEmail(m: { to: string; subject: string; text: string; html: string }) {
  if (!emailProvider()) {
    if (process.env.NODE_ENV !== "production") { console.log(`\n[email:dev] To: ${m.to}\nSubject: ${m.subject}\n${m.text}\n`); return; }
    throw new Error("Email is not configured. Set EMAIL_FROM plus BREVO_API_KEY, RESEND_API_KEY or EMAIL_SERVER.");
  }
  await deliver(m);
}
const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
export const actionEmail = (o: { name: string; heading: string; intro: string; button: string; url: string; note: string }) => ({
  text: `Hi ${o.name},\n\n${o.intro}\n\n${o.button}: ${o.url}\n\n${o.note}\n\nVyoma Route`,
  html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;color:#111"><h2 style="margin:0 0 12px">${esc(o.heading)}</h2><p>Hi ${esc(o.name)},</p><p>${esc(o.intro)}</p><p style="margin:24px 0"><a href="${esc(o.url)}" style="background:#4f46e5;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:bold">${esc(o.button)}</a></p><p style="color:#555;font-size:13px">${esc(o.note)}</p><p style="color:#999;font-size:12px">If the button does not work, paste this link into your browser:<br>${esc(o.url)}</p></div>`,
});
