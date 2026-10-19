import { randomBytes } from "crypto";
import { prisma } from "@/lib/db/prisma";
import { track } from "@/lib/tracking/service";
import { bucket } from "@/lib/seller/risk";
import { eventFor } from "@/lib/seller/events";
import { activePlan } from "@/lib/seller/plans";
import { toE164, waEnabled } from "@/lib/whatsapp";
type O = { id: string; merchantId: string; awb: string | null; carrierCode: string | null; trackToken: string | null; phone: string | null; notifyOptIn: boolean; lastEvent: string | null };
// One refresh, used by the "Refresh" button AND the background worker: update the order, open/close NDR cases, and log/queue customer messages.
export async function refreshOrder(o: O) {
  const r = await track(o.awb!, o.carrierCode ?? undefined, { refresh: true }); const detailed = r.shipment.currentStatus; const status = bucket(detailed); const ev = r.shipment.events;
  await prisma.order.update({ where: { id: o.id }, data: { status, lastRefreshedAt: new Date(), carrierName: r.shipment.carrier.name, shippedAt: ev[0] ? new Date(ev[0].eventTime) : null, deliveredAt: status === "DELIVERED" && ev.length ? new Date(ev.at(-1)!.eventTime) : null, ...(status === "NDR" && !o.trackToken ? { trackToken: randomBytes(12).toString("base64url") } : {}) } });
  const open = await prisma.ndrCase.findFirst({ where: { orderId: o.id, status: { not: "RESOLVED" } } });
  if (status === "NDR" && !open) await prisma.ndrCase.create({ data: { merchantId: o.merchantId, orderId: o.id, reason: ev.at(-1)?.description?.slice(0, 200) ?? null } });
  if ((status === "DELIVERED" || status === "RTO") && open) await prisma.ndrCase.updateMany({ where: { orderId: o.id, status: { not: "RESOLVED" } }, data: { status: "RESOLVED", resolvedAt: new Date() } });
  const e = eventFor(detailed, o.lastEvent); if (!e) return status;
  await prisma.order.update({ where: { id: o.id }, data: { lastEvent: e } });
  await prisma.shipmentNotification.create({ data: { merchantId: o.merchantId, orderId: o.id, event: e, channel: "IN_APP", status: "LOGGED" } });
  const m = await prisma.merchant.findUnique({ where: { id: o.merchantId }, select: { plan: true, planUntil: true } });
  const fresh = Date.now() - new Date(r.shipment.lastUpdatedAt).getTime() < 48 * 3600_000; // never send a customer an old update just because we only looked now
  if (m && activePlan(m) !== "FREE" && o.notifyOptIn && fresh && waEnabled() && process.env.WHATSAPP_TEMPLATE_STATUS && toE164(o.phone)) {
    const limit = Number(process.env.WHATSAPP_MONTHLY_LIMIT) || 500, start = new Date(); start.setUTCDate(1); start.setUTCHours(0, 0, 0, 0); // per-seller monthly cap on WhatsApp messages
    const used = await prisma.shipmentNotification.count({ where: { merchantId: o.merchantId, channel: "WHATSAPP", status: { not: "FAILED" }, createdAt: { gte: start } } }); const over = used >= limit;
    const n = await prisma.shipmentNotification.create({ data: { merchantId: o.merchantId, orderId: o.id, event: e, channel: "WHATSAPP", status: over ? "FAILED" : "QUEUED", detail: over ? `Monthly limit of ${limit} WhatsApp messages reached` : null } });
    if (!over) await prisma.job.create({ data: { type: "notify.whatsapp", merchantId: o.merchantId, payload: { notificationId: n.id } } });
  }
  return status;
}
