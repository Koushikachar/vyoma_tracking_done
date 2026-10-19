import { prisma } from "@/lib/db/prisma";
import { STATUSES } from "@/lib/carriers/types";
const MAX = 5;
// Expected payload: { eventId, trackingId, status, rawStatus?, description?, location?, eventTime? }
async function apply(carrier: string, p: any) {
  const sh = await prisma.shipment.findUnique({ where: { carrierCode_trackingId: { carrierCode: carrier, trackingId: String(p.trackingId) } } });
  if (!sh) throw new Error("shipment unknown");
  const status = (STATUSES as readonly string[]).includes(p.status) ? p.status : "UNKNOWN"; const t = p.eventTime ? new Date(p.eventTime) : new Date();
  await prisma.shipmentEvent.createMany({ skipDuplicates: true, data: [{ shipmentId: sh.id, eventTime: t, status, rawStatus: String(p.rawStatus ?? p.status), description: p.description, location: p.location, source: "webhook" }] });
  await prisma.shipment.update({ where: { id: sh.id }, data: { currentStatus: status, currentStatusRaw: String(p.rawStatus ?? p.status), lastUpdatedAt: t } });
}
export async function processPending() {
  const due = await prisma.webhookEvent.findMany({ where: { status: { in: ["pending", "failed"] }, OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: new Date() } }] }, take: 50 });
  for (const e of due) {
    try { await apply(e.carrier, e.payload); await prisma.webhookEvent.update({ where: { id: e.id }, data: { status: "processed", processedAt: new Date(), attempts: e.attempts + 1, error: null } }); }
    catch (err: any) { const a = e.attempts + 1; // exponential backoff: 30s, 60s, 120s... then dead-letter
      await prisma.webhookEvent.update({ where: { id: e.id }, data: { attempts: a, status: a >= MAX ? "dead" : "failed", error: String(err.message).slice(0, 200), nextAttemptAt: new Date(Date.now() + 30_000 * 2 ** (a - 1)) } }); }
  }
  return due.length;
}
