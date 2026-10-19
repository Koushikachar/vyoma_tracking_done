import { getCred, safeBaseUrl } from "../credentials";
import { CarrierAdapter, TrackingError, VyomaStatus, NormalizedEvent } from "../types";
// UNVERIFIED against a live account: written to Delhivery's documented tracking API (GET /api/v1/packages/json/?waybill=, "Authorization: Token <key>").
// Test with a real key and a real waybill before trusting the status mapping below.
const DEFAULT_BASE = "https://track.delhivery.com";
const RULES: [RegExp, VyomaStatus][] = [
  [/manifest|order placed|not picked/i, "ORDER_CREATED"], [/picked up|pickup done/i, "PICKED_UP"], [/reached.*(destination|delivery)|destination (hub|center)/i, "AT_DESTINATION_HUB"],
  [/out for delivery|dispatched/i, "OUT_FOR_DELIVERY"], [/delivered/i, "DELIVERED"], [/undeliver|attempt|not delivered/i, "DELIVERY_ATTEMPTED"],
  [/rto.*(deliver|received)|returned/i, "RETURNED"], [/rto|return/i, "RTO"], [/in transit|transit|bagged|dispatched to/i, "IN_TRANSIT"], [/hold|damag|delay|misroute|pending/i, "EXCEPTION"],
];
const map = (s: string): VyomaStatus => RULES.find(([r]) => r.test(s))?.[1] ?? "UNKNOWN";
export const delhivery: CarrierAdapter = {
  code: "delhivery", name: "Delhivery",
  isConfigured: () => !!getCred("delhivery")?.token, // no key = never reported as live
  async detect(id) { return { carrier: "delhivery", confidence: /^\d{12,14}$/.test(id) ? 0.55 : 0 }; }, // ambiguous format: user must confirm carrier
  async fetchTracking(id) {
    const t0 = Date.now(); let res: Response; const c = getCred("delhivery"); if (!c) throw new TrackingError("UNSUPPORTED_CARRIER", 400);
    const base = safeBaseUrl(c.baseUrl, "delhivery.com") ?? DEFAULT_BASE; // admin-supplied URL restricted to delhivery.com (SSRF guard)
    try { res = await fetch(`${base}/api/v1/packages/json/?waybill=${encodeURIComponent(id)}&verbose=2`, { headers: { Authorization: `Token ${c.token}` }, signal: AbortSignal.timeout(8000), cache: "no-store" }); }
    catch { throw new TrackingError("PROVIDER_UNAVAILABLE", 504, "timeout/network"); }
    if (res.status === 429) throw new TrackingError("RATE_LIMITED", 429, "carrier 429");
    if (res.status === 404) throw new TrackingError("SHIPMENT_NOT_FOUND", 404);
    if (!res.ok) throw new TrackingError("PROVIDER_UNAVAILABLE", 503, `carrier HTTP ${res.status}`); // 401/403/5xx all map to a safe message
    const payload = await res.json().catch(() => null);
    if (!payload?.ShipmentData?.[0]?.Shipment) throw new TrackingError("SHIPMENT_NOT_FOUND", 404);
    return { carrier: "delhivery", payload, latencyMs: Date.now() - t0 };
  },
  normalize(raw, trackingId) {
    const sh = (raw.payload as any).ShipmentData[0].Shipment;
    const events: NormalizedEvent[] = (sh.Scans ?? []).map((x: any) => { const d = x.ScanDetail ?? {}; const text = `${d.Scan ?? ""} ${d.Instructions ?? ""}`;
      return { eventTime: new Date(d.ScanDateTime).toISOString(), status: d.ScanType === "RT" ? map("rto " + text) : map(text), rawStatus: String(d.Scan ?? d.StatusCode ?? ""), description: d.Instructions, location: d.ScannedLocation, source: "delhivery" }; })
      .sort((a: NormalizedEvent, b: NormalizedEvent) => +new Date(a.eventTime) - +new Date(b.eventTime));
    const st = sh.Status ?? {}; const raws = `${st.Status ?? ""} ${st.Instructions ?? ""}`;
    return { trackingId, carrier: { code: "delhivery", name: "Delhivery" }, currentStatus: map(raws), currentStatusRaw: String(st.Status ?? ""),
      lastUpdatedAt: new Date(st.StatusDateTime ?? events.at(-1)?.eventTime ?? Date.now()).toISOString(),
      estimatedDeliveryAt: sh.ExpectedDeliveryDate ? new Date(sh.ExpectedDeliveryDate).toISOString() : undefined,
      origin: sh.Origin, destination: sh.Destination, events };
  },
  async healthCheck() { return getCred("delhivery") ? { status: "HEALTHY" as const } : { status: "NOT_CONFIGURED" as const }; }, // real probe needs a known waybill
};
