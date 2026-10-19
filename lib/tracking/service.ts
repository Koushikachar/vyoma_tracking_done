import { z } from "zod";
import { createHash } from "crypto";
import { listAdapters, getAdapter } from "../carriers/registry";
import { CATALOG } from "../carriers/catalog";
import { loadCredentials } from "../carriers/credentials";
import { getSettings, Settings } from "../settings";
import { loadCached } from "./persist";
import { TrackingError, CarrierAdapter, NormalizedShipment } from "../carriers/types";

export const trackingIdSchema = z.string().trim().regex(/^[A-Za-z0-9-]{6,40}$/);
export const hashId = (id: string) => createHash("sha256").update(id).digest("hex").slice(0, 16);
const CONFIDENCE_MIN = 0.6;
// Carriers without their own adapter are looked up through Ship24, which detects the courier itself.
const VIA_SHIP24 = new Set(CATALOG.filter(c => c.kind === "ship24").map(c => c.code));
export type TrackMeta = { cached: boolean; stale: boolean; lastCarrierSyncAt: string };

// One carrier: saved-result cache, live lookup, and last-known-data fallback if the carrier is down.
async function run(adapter: CarrierAdapter, id: string, confidence: number, cfg: Settings, refresh?: boolean) {
  if (!refresh) { const c = await loadCached(adapter.code, id, cfg.cacheSeconds * 1000);
    if (c) return { shipment: c.shipment, confidence, latencyMs: 0, carrierCode: adapter.code, live: false, meta: { cached: true, stale: false, lastCarrierSyncAt: c.syncedAt } as TrackMeta }; }
  try {
    const raw = await Promise.race([adapter.fetchTracking(id), new Promise<never>((_, rej) => setTimeout(() => rej(new TrackingError("PROVIDER_UNAVAILABLE", 504, `timeout after ${adapter.timeoutMs ?? 8000} ms`)), adapter.timeoutMs ?? 8000))]);
    let shipment: NormalizedShipment; try { shipment = adapter.normalize(raw, id); } catch { throw new TrackingError("INTERNAL_ERROR", 500, "normalization failed"); }
    return { shipment, confidence, latencyMs: raw.latencyMs, carrierCode: adapter.code, live: true, meta: { cached: false, stale: false, lastCarrierSyncAt: new Date().toISOString() } as TrackMeta };
  } catch (e) {
    if (e instanceof TrackingError && e.internal) (e.code === "SHIPMENT_NOT_FOUND" ? console.warn : console.error)(`[carrier:${adapter.code}] ${e.code}: ${e.internal}`); // real cause stays in server logs, users only see the safe message
    if (e instanceof TrackingError && e.code === "PROVIDER_UNAVAILABLE") { const s = await loadCached(adapter.code, id, Infinity);
      if (s) return { shipment: s.shipment, confidence, latencyMs: 0, carrierCode: adapter.code, live: false, meta: { cached: true, stale: true, lastCarrierSyncAt: s.syncedAt } as TrackMeta }; }
    throw e;
  }
}

export async function track(rawId: string, carrierCode?: string, opts: { refresh?: boolean } = {}) {
  const parsed = trackingIdSchema.safeParse(rawId); if (!parsed.success) throw new TrackingError("INVALID_TRACKING_ID", 400);
  const id = parsed.data; await loadCredentials(); const cfg = await getSettings();
  if (cfg.maintenanceMode) throw new TrackingError("PROVIDER_UNAVAILABLE", 503, "maintenance");
  let cands: { a: CarrierAdapter; confidence: number }[];
  if (carrierCode) { const a = getAdapter(VIA_SHIP24.has(carrierCode) ? "ship24" : carrierCode); if (!a) throw new TrackingError("UNSUPPORTED_CARRIER", 400); cands = [{ a, confidence: 1 }]; }
  else {
    const scored = await Promise.all(listAdapters().filter(a => a.isConfigured()).map(async a => ({ a, confidence: (await a.detect(id)).confidence })));
    const sure = scored.filter(x => x.confidence >= CONFIDENCE_MIN).sort((x, y) => y.confidence - x.confidence);
    if (sure.length) cands = sure;
    else { // Not sure: try direct carriers whose number format matches (free), then the aggregator (Ship24) as the catch-all
      const guesses = scored.filter(x => x.confidence > 0 && !["ship24", "vyoma_test"].includes(x.a.code)).sort((x, y) => y.confidence - x.confidence); const agg = scored.find(x => x.a.code === "ship24");
      cands = [...guesses, ...(agg ? [{ a: agg.a, confidence: 0.5 }] : [])];
      if (!cands.length) { const real = scored.filter(x => x.a.code !== "vyoma_test"); if (real.length === 1) cands = [{ a: real[0].a, confidence: 0.5 }]; else throw new TrackingError("CARRIER_REQUIRED", 422); }
    }
  }
  let err: TrackingError | undefined;
  for (const c of cands) { try { return await run(c.a, id, c.confidence, cfg, opts.refresh); } catch (e) { if (!(e instanceof TrackingError)) throw e; if (!err || err.code === "SHIPMENT_NOT_FOUND") err = e; } } // keep the most informative error
  throw err!;
}
