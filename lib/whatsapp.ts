import { createHmac, timingSafeEqual } from "crypto";
// WhatsApp Cloud API (Meta). Only pre-approved TEMPLATE messages are sent, which is what Meta requires for business-started chats.
export const waEnabled = () => !!(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID);
export const toE164 = (p?: string | null) => { const d = (p ?? "").replace(/\D/g, "").slice(-10); return /^[6-9]\d{9}$/.test(d) ? `91${d}` : null; }; // Indian mobiles only
export async function sendTemplate(to: string, template: string, params: string[], buttonPayloads: string[] = []) {
  const r = await fetch(`https://graph.facebook.com/${process.env.WHATSAPP_API_VERSION || "v21.0"}/${process.env.WHATSAPP_PHONE_ID}/messages`, { method: "POST", signal: AbortSignal.timeout(15_000),
    headers: { authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to, type: "template", template: { name: template, language: { code: process.env.WHATSAPP_LANG || "en" }, components: [
      { type: "body", parameters: params.map(text => ({ type: "text", text })) },
      ...buttonPayloads.map((payload, i) => ({ type: "button", sub_type: "quick_reply", index: String(i), parameters: [{ type: "payload", payload }] }))] } }) });
  if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error(`WhatsApp ${r.status}: ${j?.error?.message ?? "request failed"}`); }
  const ok = await r.json().catch(() => ({} as any)); return (ok?.messages?.[0]?.id as string | undefined) ?? null; // message id, matched later with delivery receipts
}
export function validSignature(raw: string, header: string | null) {
  const s = process.env.WHATSAPP_APP_SECRET; if (!s || !header?.startsWith("sha256=")) return false;
  const a = Buffer.from(header.slice(7)), b = Buffer.from(createHmac("sha256", s).update(raw).digest("hex")); return a.length === b.length && timingSafeEqual(a, b);
}
