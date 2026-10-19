import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { toE164, validSignature } from "@/lib/whatsapp";
// Meta verifies the URL once with a GET (hub.challenge), then POSTs events signed with the app secret.
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams; const t = process.env.WHATSAPP_VERIFY_TOKEN;
  return t && q.get("hub.mode") === "subscribe" && q.get("hub.verify_token") === t ? new NextResponse(q.get("hub.challenge") ?? "", { status: 200 }) : new NextResponse(null, { status: 403 });
}
export async function POST(req: NextRequest) {
  const raw = await req.text(); if (!validSignature(raw, req.headers.get("x-hub-signature-256"))) return new NextResponse(null, { status: 401 });
  let ev: any; try { ev = JSON.parse(raw); } catch { return new NextResponse(null, { status: 400 }); }
  for (const s of (ev.entry ?? []).flatMap((e: any) => (e.changes ?? []).flatMap((c: any) => c.value?.statuses ?? []))) { // delivery receipts: only ever move a message forward (sent, delivered, read) or to failed
    if (!s?.id) continue; const up = s.status === "delivered" ? { from: ["SENT"], to: "DELIVERED" } : s.status === "read" ? { from: ["SENT", "DELIVERED"], to: "READ" } : s.status === "failed" ? { from: ["SENT", "QUEUED", "DELIVERED"], to: "FAILED" } : null; if (!up) continue;
    await prisma.shipmentNotification.updateMany({ where: { providerId: String(s.id), status: { in: up.from } }, data: { status: up.to, ...(up.to === "FAILED" ? { detail: String(s.errors?.[0]?.message ?? s.errors?.[0]?.title ?? "Delivery failed").slice(0, 200) } : {}) } });
  }
  for (const m of (ev.entry ?? []).flatMap((e: any) => (e.changes ?? []).flatMap((c: any) => c.value?.messages ?? []))) {
    if (m?.type === "text" && /^\s*(stop|unsubscribe)\s*$/i.test(m.text?.body ?? "")) { const last10 = String(m.from ?? "").slice(-10); if (last10.length === 10) await prisma.order.updateMany({ where: { phone: { endsWith: last10 } }, data: { notifyOptIn: false } }); continue; } // opt-out (finds phones stored as plain digits)
    const [kind, answer, orderId] = String(m?.button?.payload ?? "").split(":"); if (m?.type !== "button" || kind !== "cod" || !orderId || !["confirm", "cancel"].includes(answer)) continue;
    const o = await prisma.order.findUnique({ where: { id: orderId }, select: { id: true, phone: true } }); if (!o || toE164(o.phone) !== m.from) continue; // the reply must come from the customer's own number
    await prisma.order.updateMany({ where: { id: o.id, codStatus: "SENT" }, data: { codStatus: answer === "confirm" ? "CONFIRMED" : "CANCELLED" } });
  }
  return NextResponse.json({ ok: true });
}
