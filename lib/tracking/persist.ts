import { prisma } from "@/lib/db/prisma";
import type { NormalizedShipment } from "@/lib/carriers/types";
const on = () => !!process.env.DATABASE_URL; // app still works without a DB (persistence is best-effort)

export async function saveLookup(d: { trackingIdHash: string; carrierCode?: string; success: boolean; errorCode?: string; source: string; latencyMs: number; requestId: string }) {
  if (!on()) return; try { await prisma.trackingLookup.create({ data: d }); } catch {}
}
export async function saveShipment(s: NormalizedShipment, confidence: number) {
  if (!on()) return;
  try {
    const code = s.carrier.code;
    const carrier = await prisma.carrier.upsert({ where: { code }, update: {}, create: { code, name: s.carrier.name, mode: code === "vyoma_test" ? "test" : "live" } });
    const f = { currentStatus: s.currentStatus, currentStatusRaw: s.currentStatusRaw, lastUpdatedAt: new Date(s.lastUpdatedAt),
      estimatedDeliveryAt: s.estimatedDeliveryAt ? new Date(s.estimatedDeliveryAt) : null,
      deliveredAt: s.currentStatus === "DELIVERED" ? new Date(s.lastUpdatedAt) : null,
      origin: s.origin, destination: s.destination, lastCarrierSyncAt: new Date(), detectionConfidence: confidence };
    const sh = await prisma.shipment.upsert({ where: { carrierCode_trackingId: { carrierCode: code, trackingId: s.trackingId } }, update: f,
      create: { ...f, trackingId: s.trackingId, carrierId: carrier.id, carrierCode: code, carrierName: s.carrier.name } });
    // History is append-only: duplicates skipped, nothing overwritten
    await prisma.shipmentEvent.createMany({ skipDuplicates: true, data: s.events.map(e => ({ shipmentId: sh.id, eventTime: new Date(e.eventTime),
      status: e.status, rawStatus: e.rawStatus, description: e.description, location: e.location, source: e.source })) });
  } catch {}
}

export async function loadCached(code: string, trackingId: string, ttlMs: number) {
  if (!on()) return null;
  try {
    const sh = await prisma.shipment.findUnique({ where: { carrierCode_trackingId: { carrierCode: code, trackingId } }, include: { events: { orderBy: { eventTime: "asc" } } } });
    if (!sh?.lastCarrierSyncAt || Date.now() - sh.lastCarrierSyncAt.getTime() > ttlMs) return null;
    const shipment: NormalizedShipment = { trackingId, carrier: { code, name: sh.carrierName }, currentStatus: sh.currentStatus, currentStatusRaw: sh.currentStatusRaw,
      lastUpdatedAt: sh.lastUpdatedAt.toISOString(), estimatedDeliveryAt: sh.estimatedDeliveryAt?.toISOString(), origin: sh.origin ?? undefined, destination: sh.destination ?? undefined,
      events: sh.events.map(e => ({ eventTime: e.eventTime.toISOString(), status: e.status, rawStatus: e.rawStatus, description: e.description ?? undefined, location: e.location ?? undefined, source: e.source })) };
    return { shipment, syncedAt: sh.lastCarrierSyncAt.toISOString() };
  } catch { return null; }
}
