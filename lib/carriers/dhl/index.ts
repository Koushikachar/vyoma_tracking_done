import { getCred } from "../credentials"; import { http } from "../http"; import { guess, place } from "../status";
import { CarrierAdapter, TrackingError, NormalizedEvent, VyomaStatus } from "../types";
// UNVERIFIED: written to DHL's Shipment Tracking (Unified) API: GET /track/shipments?trackingNumber= with header DHL-API-Key. Test with a real key.
const BASE = process.env.DHL_BASE_URL ?? "https://api-eu.dhl.com";
const CODE: Record<string, VyomaStatus> = { "pre-transit": "ORDER_CREATED", transit: "IN_TRANSIT", delivered: "DELIVERED", failure: "EXCEPTION" };
const map = (code?: string, text?: string): VyomaStatus => { const g = guess(text); return g !== "UNKNOWN" ? g : CODE[code ?? ""] ?? "UNKNOWN"; };
export const dhl: CarrierAdapter = {
  code: "dhl", name: "DHL", isConfigured: () => !!getCred("dhl")?.token,
  async detect(id) { return { carrier: "dhl", confidence: /^\d{10}$/.test(id) || /^JJD\d+$/i.test(id) ? 0.4 : 0 }; }, // ambiguous: user confirms carrier
  async fetchTracking(id) { const t0 = Date.now(); const j = await http(`${BASE}/track/shipments?trackingNumber=${encodeURIComponent(id)}`, { headers: { "DHL-API-Key": getCred("dhl")!.token } });
    if (!j?.shipments?.[0]) throw new TrackingError("SHIPMENT_NOT_FOUND", 404); return { carrier: "dhl", payload: j.shipments[0], latencyMs: Date.now() - t0 }; },
  normalize(raw, trackingId) { const s: any = raw.payload;
    const events: NormalizedEvent[] = (s.events ?? []).map((e: any) => ({ eventTime: new Date(e.timestamp).toISOString(), status: map(e.statusCode, `${e.status} ${e.description}`), rawStatus: String(e.statusCode ?? e.status ?? ""), description: e.description ?? e.status, location: e.location?.address?.addressLocality, source: "dhl" }))
      .sort((a: NormalizedEvent, b: NormalizedEvent) => +new Date(a.eventTime) - +new Date(b.eventTime));
    const st = s.status ?? {}; return { trackingId, carrier: { code: "dhl", name: "DHL" }, currentStatus: map(st.statusCode, `${st.status} ${st.description}`), currentStatusRaw: String(st.statusCode ?? st.status ?? ""),
      lastUpdatedAt: new Date(st.timestamp ?? events.at(-1)?.eventTime ?? Date.now()).toISOString(), estimatedDeliveryAt: s.estimatedTimeOfDelivery ? new Date(s.estimatedTimeOfDelivery).toISOString() : undefined,
      origin: place(s.origin?.address?.addressLocality, s.origin?.address?.countryCode), destination: place(s.destination?.address?.addressLocality, s.destination?.address?.countryCode), events }; },
  async healthCheck() { return { status: getCred("dhl") ? "HEALTHY" as const : "NOT_CONFIGURED" as const }; },
};
