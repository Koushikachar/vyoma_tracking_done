import { getCred } from "../credentials"; import { http } from "../http"; import { guess, place } from "../status";
import { CarrierAdapter, TrackingError, NormalizedEvent, VyomaStatus } from "../types";
// UNVERIFIED: FedEx Track API (OAuth client_credentials, then POST /track/v1/trackingnumbers). Key is saved as CLIENT_ID:CLIENT_SECRET. Use FEDEX_BASE_URL for sandbox.
const BASE = process.env.FEDEX_BASE_URL ?? "https://apis.fedex.com";
const D: Record<string, VyomaStatus> = { DL: "DELIVERED", OD: "OUT_FOR_DELIVERY", PU: "PICKED_UP", IT: "IN_TRANSIT", DE: "DELIVERY_ATTEMPTED", SE: "EXCEPTION", HL: "EXCEPTION", CA: "EXCEPTION", IN: "ORDER_CREATED", RS: "RETURNED" };
const map = (c?: string, t?: string): VyomaStatus => D[c ?? ""] ?? guess(t);
let tok: { v: string; exp: number } | null = null;
async function token() { if (tok && tok.exp > Date.now() + 60_000) return tok.v; const [id, secret] = getCred("fedex")!.token.split(":");
  const j = await http(`${BASE}/oauth/token`, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "client_credentials", client_id: id, client_secret: secret ?? "" }) });
  tok = { v: j.access_token, exp: Date.now() + (j.expires_in ?? 3000) * 1000 }; return tok.v; }
export const fedex: CarrierAdapter = {
  code: "fedex", name: "FedEx", isConfigured: () => !!getCred("fedex")?.token.includes(":"),
  async detect(id) { return { carrier: "fedex", confidence: /^(\d{12}|\d{15}|\d{20}|\d{22})$/.test(id) ? 0.4 : 0 }; },
  async fetchTracking(id) { const t0 = Date.now(); const j = await http(`${BASE}/track/v1/trackingnumbers`, { method: "POST", headers: { authorization: `Bearer ${await token()}`, "content-type": "application/json", "x-locale": "en_US" },
      body: JSON.stringify({ includeDetailedScans: true, trackingInfo: [{ trackingNumberInfo: { trackingNumber: id } }] }) });
    const r = j?.output?.completeTrackResults?.[0]?.trackResults?.[0]; if (!r || r.error) throw new TrackingError("SHIPMENT_NOT_FOUND", 404); return { carrier: "fedex", payload: r, latencyMs: Date.now() - t0 }; },
  normalize(raw, trackingId) { const r: any = raw.payload;
    const events: NormalizedEvent[] = (r.scanEvents ?? []).map((e: any) => ({ eventTime: new Date(e.date).toISOString(), status: map(e.derivedStatusCode, `${e.eventDescription} ${e.derivedStatus ?? ""}`), rawStatus: String(e.eventType ?? e.derivedStatusCode ?? ""), description: e.eventDescription, location: place(e.scanLocation?.city, e.scanLocation?.countryCode), source: "fedex" }))
      .sort((a: NormalizedEvent, b: NormalizedEvent) => +new Date(a.eventTime) - +new Date(b.eventTime));
    const l = r.latestStatusDetail ?? {}; const eta = (r.dateAndTimes ?? []).find((d: any) => /ESTIMATED_DELIVERY/.test(d.type))?.dateTime; const a = (x: any) => x?.locationContactAndAddress?.address;
    return { trackingId, carrier: { code: "fedex", name: "FedEx" }, currentStatus: map(l.derivedCode, `${l.description} ${l.statusByLocale}`), currentStatusRaw: String(l.description ?? l.code ?? ""),
      lastUpdatedAt: new Date(events.at(-1)?.eventTime ?? Date.now()).toISOString(), estimatedDeliveryAt: eta ? new Date(eta).toISOString() : undefined,
      origin: place(a(r.originLocation)?.city, a(r.originLocation)?.countryCode), destination: place(a(r.destinationLocation)?.city, a(r.destinationLocation)?.countryCode), events }; },
  async healthCheck() { return { status: getCred("fedex") ? "HEALTHY" as const : "NOT_CONFIGURED" as const }; },
};
