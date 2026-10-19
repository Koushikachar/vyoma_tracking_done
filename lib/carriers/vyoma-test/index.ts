import { CarrierAdapter, TrackingError, VyomaStatus, NormalizedEvent } from "../types";

// Scenario token in ID -> carrier-style raw events (simulator only; no API key needed)
const FLOW: [string, string, string][] = [
  ["CREATED","Shipment manifest created","Hyderabad"],
  ["PICKUP_DONE","Parcel collected from shipper","Hyderabad"],
  ["IN_NETWORK","Shipment in transit to destination","Nagpur"],
  ["REACHED_HUB","Shipment reached final delivery center","Bengaluru"],
  ["WITH_AGENT","Out for delivery with agent","Bengaluru"],
  ["DLVD","Delivered to consignee","Bengaluru"],
];
const SCENARIOS: Record<string, string[]> = {
  ORDER: FLOW.slice(0,1).map(f=>f[0]), PICKED: FLOW.slice(0,2).map(f=>f[0]),
  INTRANSIT: FLOW.slice(0,3).map(f=>f[0]), DESTINATION: FLOW.slice(0,4).map(f=>f[0]),
  OUTFORDELIVERY: FLOW.slice(0,5).map(f=>f[0]), DELIVERED: FLOW.map(f=>f[0]),
  ATTEMPTED: [...FLOW.slice(0,5).map(f=>f[0]),"NDR_ATTEMPT"],
  EXCEPTION: [...FLOW.slice(0,3).map(f=>f[0]),"HELD_DAMAGED"],
  RTO: [...FLOW.slice(0,5).map(f=>f[0]),"NDR_ATTEMPT","RTO_INIT"],
  RETURNED: [...FLOW.slice(0,5).map(f=>f[0]),"NDR_ATTEMPT","RTO_INIT","RTO_DLVD"],
  UNKNOWN: ["CREATED","ZZ_MYSTERY_CODE"],
};
const MAP: Record<string, VyomaStatus> = {
  CREATED:"ORDER_CREATED", PICKUP_DONE:"PICKED_UP", IN_NETWORK:"IN_TRANSIT", REACHED_HUB:"AT_DESTINATION_HUB",
  WITH_AGENT:"OUT_FOR_DELIVERY", DLVD:"DELIVERED", NDR_ATTEMPT:"DELIVERY_ATTEMPTED", HELD_DAMAGED:"EXCEPTION",
  RTO_INIT:"RTO", RTO_DLVD:"RETURNED",
};
const RE = /^VYT-([A-Z]+(?:-[A-Z]+)?)-\d+$/i;
const scenarioOf = (id: string) => RE.exec(id)?.[1].toUpperCase().replace("-","");

export const vyomaTest: CarrierAdapter = {
  code: "vyoma_test", name: "VYOMA Test Carrier",
  isConfigured: () => true,
  async detect(id) { return { carrier: "vyoma_test", confidence: RE.test(id) ? 1 : 0 }; },
  async fetchTracking(id) {
    const t0 = Date.now(); const s = scenarioOf(id) ?? "";
    if (s === "RATELIMIT") throw new TrackingError("RATE_LIMITED", 429, "sim 429");
    if (s === "OUTAGE") throw new TrackingError("PROVIDER_UNAVAILABLE", 503, "sim 503");
    const codes = SCENARIOS[s];
    if (!codes) throw new TrackingError("SHIPMENT_NOT_FOUND", 404);
    const start = Date.now() - codes.length * 6 * 3600_000;
    const events = codes.map((c, i) => {
      const f = FLOW.find(x => x[0] === c);
      return { code: c, desc: f?.[1] ?? c.replace(/_/g," ").toLowerCase(), location: f?.[2] ?? "Bengaluru",
               time: new Date(start + i * 6 * 3600_000).toISOString() };
    });
    return { carrier: "vyoma_test", payload: { events }, latencyMs: Date.now() - t0 };
  },
  normalize(raw, trackingId) {
    const evs = (raw.payload as any).events as {code:string;desc:string;location:string;time:string}[];
    const events: NormalizedEvent[] = evs.map(e => ({
      eventTime: e.time, status: MAP[e.code] ?? "UNKNOWN", rawStatus: e.code,
      description: e.desc, location: e.location, source: "vyoma_test" }));
    const last = events[events.length - 1];
    return { trackingId, carrier: { code: this.code, name: this.name },
      currentStatus: last.status, currentStatusRaw: last.rawStatus, lastUpdatedAt: last.eventTime,
      estimatedDeliveryAt: last.status === "DELIVERED" ? undefined : new Date(Date.now() + 86400_000).toISOString(),
      origin: "Hyderabad", destination: "Bengaluru", events };
  },
  async healthCheck() { return { status: "HEALTHY", latencyMs: 0 }; },
};
