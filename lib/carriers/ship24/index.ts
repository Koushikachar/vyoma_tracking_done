import { getCred } from "../credentials"; import { guess, place } from "../status";
import { CarrierAdapter, TrackingError, NormalizedEvent, VyomaStatus } from "../types";
// Ship24 Tracking API: POST /public/v1/trackers/track (Bearer key) creates the tracker and returns results in one call.
// Ship24 detects the courier itself, so this works for any carrier it supports (including Indian ones).
const BASE = "https://api.ship24.com/public/v1";
const TIMEOUT = 25_000; // Ship24 can take 10+ s on a first lookup; the shared 8 s limit was the usual cause of "temporarily unavailable"
const MILESTONE: Record<string, VyomaStatus> = { info_received: "ORDER_CREATED", in_transit: "IN_TRANSIT", out_for_delivery: "OUT_FOR_DELIVERY", failed_attempt: "DELIVERY_ATTEMPTED", available_for_pickup: "AT_DESTINATION_HUB", delivered: "DELIVERED", exception: "EXCEPTION", pending: "UNKNOWN" };
const KEEP: VyomaStatus[] = ["PICKED_UP", "RTO", "RETURNED", "AT_DESTINATION_HUB"]; // finer states Ship24's milestones don't have
const map = (milestone?: string, text?: string): VyomaStatus => { const g = guess(text); return KEEP.includes(g) ? g : MILESTONE[milestone ?? ""] ?? g; };

// Own request helper so each HTTP status gets a precise internal reason (shown in Test connection and server logs, never to end users).
async function call(path: string, init: RequestInit = {}) {
  const key = getCred("ship24")?.token; if (!key) throw new TrackingError("UNSUPPORTED_CARRIER", 400, "no Ship24 key");
  let res: Response;
  try { res = await fetch(`${BASE}${path}`, { ...init, headers: { authorization: `Bearer ${key}`, "content-type": "application/json" }, signal: AbortSignal.timeout(TIMEOUT), cache: "no-store" }); }
  catch (e) { throw new TrackingError("PROVIDER_UNAVAILABLE", 504, `Ship24 network/timeout: ${(e as Error)?.name ?? "error"}`); }
  if (res.ok) return res.json().catch(() => { throw new TrackingError("PROVIDER_UNAVAILABLE", 502, "Ship24 returned invalid JSON"); });
  const body = (await res.text().catch(() => "")).slice(0, 200);
  if (res.status === 401 || res.status === 403) throw new TrackingError("PROVIDER_UNAVAILABLE", 503, `Ship24 rejected the API key (HTTP ${res.status}). Create a new key in Ship24 > API and save it again. ${body}`);
  if (res.status === 402) throw new TrackingError("PROVIDER_UNAVAILABLE", 503, `Ship24 plan/quota exhausted (HTTP 402). ${body}`);
  if (res.status === 429) throw new TrackingError("RATE_LIMITED", 429, "Ship24 rate limit");
  if (res.status === 404 || res.status === 400 || res.status === 422) throw new TrackingError("SHIPMENT_NOT_FOUND", 404, `Ship24 HTTP ${res.status}: ${body}`); // bad / unknown tracking number
  throw new TrackingError("PROVIDER_UNAVAILABLE", 503, `Ship24 HTTP ${res.status}: ${body}`);
}
const pick = (j: any) => j?.data?.trackings?.[0];

export const ship24: CarrierAdapter = {
  code: "ship24", name: "Ship24", timeoutMs: TIMEOUT + 2000, isConfigured: () => !!getCred("ship24")?.token,
  async detect() { return { carrier: "ship24", confidence: 0.2 }; }, // fallback only: used when no direct carrier matches
  async fetchTracking(id) { const t0 = Date.now();
    let t = pick(await call("/trackers/track", { method: "POST", body: JSON.stringify({ trackingNumber: id }) }));
    if (t && !t.events?.length) { // brand-new tracker: Ship24 may still be fetching, so look once more before giving up
      await new Promise(r => setTimeout(r, 3000));
      try { const again = pick(await call(`/trackers/search/${encodeURIComponent(id)}/results`)); if (again?.events?.length) t = again; } catch (e) { if (!(e instanceof TrackingError) || e.code !== "SHIPMENT_NOT_FOUND") throw e; }
    }
    if (!t || !t.events?.length) throw new TrackingError("SHIPMENT_NOT_FOUND", 404, "Ship24 has no events yet for this number");
    return { carrier: "ship24", payload: t, latencyMs: Date.now() - t0 }; },
  normalize(raw, trackingId) { const t: any = raw.payload; const sh = t.shipment ?? {};
    const events: NormalizedEvent[] = (t.events ?? []).map((e: any) => ({ eventTime: new Date(e.occurrenceDatetime ?? e.datetime).toISOString(), status: map(e.statusMilestone, e.status), rawStatus: String(e.statusCode ?? e.statusMilestone ?? ""), description: e.status, location: e.location, source: "ship24" }))
      .sort((a: NormalizedEvent, b: NormalizedEvent) => +new Date(a.eventTime) - +new Date(b.eventTime)); const last = events.at(-1); const courier = t.events?.[0]?.courierCode;
    return { trackingId, carrier: { code: "ship24", name: courier ? `Ship24 · ${courier}` : "Ship24" }, currentStatus: map(sh.statusMilestone, last?.description), currentStatusRaw: String(sh.statusCode ?? sh.statusMilestone ?? last?.rawStatus ?? ""),
      lastUpdatedAt: last?.eventTime ?? new Date().toISOString(), estimatedDeliveryAt: sh.delivery?.estimatedDeliveryDate ? new Date(sh.delivery.estimatedDeliveryDate).toISOString() : undefined,
      origin: place(sh.originCountryCode), destination: place(sh.recipient?.city, sh.destinationCountryCode), events }; },
  async healthCheck() { return { status: getCred("ship24") ? "HEALTHY" as const : "NOT_CONFIGURED" as const }; },
};
