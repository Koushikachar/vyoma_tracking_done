import { randomUUID } from "crypto";
import { getCred } from "../credentials"; import { http } from "../http"; import { guess, place } from "../status";
import { CarrierAdapter, TrackingError, NormalizedEvent, VyomaStatus } from "../types";
// UNVERIFIED: UPS Tracking API (OAuth client_credentials, then GET /api/track/v1/details/{number}). Key is saved as CLIENT_ID:CLIENT_SECRET. Use UPS_BASE_URL for the CIE test environment.
const BASE = process.env.UPS_BASE_URL ?? "https://onlinetools.ups.com";
const T: Record<string, VyomaStatus> = { M: "ORDER_CREATED", P: "PICKED_UP", D: "DELIVERED", X: "EXCEPTION", RS: "RETURNED" };
const map = (type?: string, text?: string): VyomaStatus => T[type ?? ""] ?? guess(text);
const iso = (d?: string, t = "000000") => d && d.length === 8 ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}T${t.slice(0, 2)}:${t.slice(2, 4)}:${t.slice(4, 6)}Z` : new Date().toISOString(); // UPS gives local time without zone; treated as UTC
let tok: { v: string; exp: number } | null = null;
async function token() { if (tok && tok.exp > Date.now() + 60_000) return tok.v; const c = getCred("ups")!.token; const j = await http(`${BASE}/security/v1/oauth/token`, { method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", authorization: `Basic ${Buffer.from(c).toString("base64")}` }, body: "grant_type=client_credentials" });
  tok = { v: j.access_token, exp: Date.now() + Number(j.expires_in ?? 3000) * 1000 }; return tok.v; }
export const ups: CarrierAdapter = {
  code: "ups", name: "UPS", isConfigured: () => !!getCred("ups")?.token.includes(":"),
  async detect(id) { return { carrier: "ups", confidence: /^1Z[0-9A-Z]{16}$/i.test(id) ? 0.95 : 0 }; }, // 1Z format is distinctive
  async fetchTracking(id) { const t0 = Date.now(); const j = await http(`${BASE}/api/track/v1/details/${encodeURIComponent(id)}?locale=en_US`, { headers: { authorization: `Bearer ${await token()}`, transId: randomUUID(), transactionSrc: "vyoma-route" } });
    const p = j?.trackResponse?.shipment?.[0]?.package?.[0]; if (!p?.activity?.length) throw new TrackingError("SHIPMENT_NOT_FOUND", 404); return { carrier: "ups", payload: p, latencyMs: Date.now() - t0 }; },
  normalize(raw, trackingId) { const p: any = raw.payload;
    const events: NormalizedEvent[] = (p.activity ?? []).map((a: any) => ({ eventTime: iso(a.date, a.time), status: map(a.status?.type, a.status?.description), rawStatus: String(a.status?.code ?? a.status?.type ?? ""), description: a.status?.description, location: place(a.location?.address?.city, a.location?.address?.country), source: "ups" }))
      .sort((a: NormalizedEvent, b: NormalizedEvent) => +new Date(a.eventTime) - +new Date(b.eventTime));
    const cs = p.currentStatus ?? {}; const last = events.at(-1); const ad = (t: string) => (p.packageAddress ?? []).find((x: any) => x.type === t)?.address;
    return { trackingId, carrier: { code: "ups", name: "UPS" }, currentStatus: last && last.status !== "UNKNOWN" ? last.status : map(undefined, cs.description), currentStatusRaw: String(cs.description ?? cs.code ?? ""),
      lastUpdatedAt: last?.eventTime ?? new Date().toISOString(), estimatedDeliveryAt: p.deliveryDate?.[0]?.date ? iso(p.deliveryDate[0].date) : undefined,
      origin: place(ad("ORIGIN")?.city, ad("ORIGIN")?.country), destination: place(ad("DESTINATION")?.city, ad("DESTINATION")?.country), events }; },
  async healthCheck() { return { status: getCred("ups") ? "HEALTHY" as const : "NOT_CONFIGURED" as const }; },
};
