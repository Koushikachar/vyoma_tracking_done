import { describe, it, expect, beforeAll } from "vitest";
import { encrypt, decrypt } from "@/lib/encryption/aes";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { newSecret, totp, verifyTotp } from "@/lib/auth/totp";
import { can } from "@/lib/auth/rbac";
import { track } from "@/lib/tracking/service";
import { rateLimit } from "@/lib/tracking/rate-limit";
beforeAll(() => { process.env.CARRIER_CREDENTIAL_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64"); });
describe("crypto", () => {
  it("AES round trips and rejects tampering", () => { const c = encrypt("secret"); expect(decrypt(c)).toBe("secret");
    expect(() => decrypt(c.slice(0, -2) + "AA")).toThrow(); });
  it("password hashing", () => { const h = hashPassword("pw"); expect(verifyPassword("pw", h)).toBe(true); expect(verifyPassword("x", h)).toBe(false); });
  it("TOTP validates current code, rejects stale", () => { const s = newSecret(); expect(verifyTotp(s, totp(s))).toBe(true);
    expect(verifyTotp(s, totp(s, Date.now() - 300_000))).toBe(false); });
});
describe("rbac", () => { it("enforces roles", () => { expect(can("SUPPORT", "apikeys")).toBe(false); expect(can("SUPER_ADMIN", "users")).toBe(true); expect(can("ANALYST", "analytics")).toBe(true); }); });
const cases: [string, string][] = [["ORDER","ORDER_CREATED"],["PICKED","PICKED_UP"],["INTRANSIT","IN_TRANSIT"],["DESTINATION","AT_DESTINATION_HUB"],
  ["OUTFORDELIVERY","OUT_FOR_DELIVERY"],["DELIVERED","DELIVERED"],["ATTEMPTED","DELIVERY_ATTEMPTED"],["EXCEPTION","EXCEPTION"],["RTO","RTO"],["RETURNED","RETURNED"],["UNKNOWN","UNKNOWN"]];
describe("tracking", () => {
  for (const [s, st] of cases) it(`normalizes ${s}`, async () => expect((await track(`VYT-${s}-1001`)).shipment.currentStatus).toBe(st));
  it("not found", async () => await expect(track("VYT-NOTFOUND-1001")).rejects.toMatchObject({ code: "SHIPMENT_NOT_FOUND" }));
  it("outage", async () => await expect(track("VYT-OUTAGE-1001")).rejects.toMatchObject({ code: "PROVIDER_UNAVAILABLE" }));
  it("carrier rate limit", async () => await expect(track("VYT-RATE-LIMIT-1001")).rejects.toMatchObject({ code: "RATE_LIMITED" }));
  it("invalid id", async () => await expect(track("!!")).rejects.toMatchObject({ code: "INVALID_TRACKING_ID" }));
  it("low confidence asks for carrier", async () => await expect(track("ABCDEF123456")).rejects.toMatchObject({ code: "CARRIER_REQUIRED" }));
  it("limiter blocks (memory fallback)", async () => { delete process.env.DATABASE_URL; let ok = true; for (let i = 0; i < 5; i++) ok = await rateLimit("t", 3); expect(ok).toBe(false); });
});
import { delhivery } from "@/lib/carriers/delhivery";
describe("delhivery", () => {
  it("is not live without a key", () => { delete process.env.DELHIVERY_API_KEY; expect(delhivery.isConfigured()).toBe(false); });
  it("normalizes a sample payload", () => {
    const payload = { ShipmentData: [{ Shipment: { Status: { Status: "Delivered", StatusDateTime: "2026-10-04T10:00:00" }, Origin: "Hyderabad", Destination: "Bengaluru",
      Scans: [{ ScanDetail: { Scan: "Manifested", ScanDateTime: "2026-10-01T09:00:00", ScannedLocation: "HYD" } }, { ScanDetail: { Scan: "Delivered", ScanDateTime: "2026-10-04T10:00:00", ScannedLocation: "BLR" } }] } }] };
    const n = delhivery.normalize({ carrier: "delhivery", payload, latencyMs: 1 }, "123456789012");
    expect(n.currentStatus).toBe("DELIVERED"); expect(n.events.map(e => e.status)).toEqual(["ORDER_CREATED", "DELIVERED"]); });
});
import { safeBaseUrl } from "@/lib/carriers/credentials";
describe("credentials", () => { it("restricts base URLs (SSRF guard)", () => {
  expect(safeBaseUrl("https://track.delhivery.com", "delhivery.com")).toBe("https://track.delhivery.com");
  expect(safeBaseUrl("https://evil.com", "delhivery.com")).toBeUndefined(); expect(safeBaseUrl("http://track.delhivery.com", "delhivery.com")).toBeUndefined();
  expect(safeBaseUrl("https://delhivery.com.evil.com", "delhivery.com")).toBeUndefined(); }); });
import { generateCodes, hashCode } from "@/lib/auth/recovery";
describe("recovery codes", () => { it("are unique, well formed, and hash case/dash-insensitively", () => {
  const c = generateCodes(); expect(new Set(c).size).toBe(10); expect(c.every(x => /^[A-Z2-9]{5}-[A-Z2-9]{5}$/.test(x))).toBe(true);
  expect(hashCode(c[0])).toBe(hashCode(c[0].toLowerCase().replace("-", " "))); }); });
import { settingsSchema } from "@/lib/settings";
describe("settings", () => { it("applies defaults and rejects out-of-range values", () => {
  expect(settingsSchema.parse({})).toMatchObject({ cacheSeconds: 300, maintenanceMode: false, publicRatePerMinute: 20 });
  expect(settingsSchema.safeParse({ publicRatePerMinute: 0 }).success).toBe(false); }); });
describe("rbac users", () => { it("only SUPER_ADMIN manages users", () => { expect(can("ADMIN", "users")).toBe(false); expect(can("SUPER_ADMIN", "users")).toBe(true); expect(can("SUPPORT", "contact")).toBe(true); expect(can("ANALYST", "contact")).toBe(false); }); });
import { dhl } from "@/lib/carriers/dhl"; import { ups } from "@/lib/carriers/ups";
describe("dhl/ups", () => {
  it("dhl normalizes", () => { const n = dhl.normalize({ carrier: "dhl", latencyMs: 1, payload: { status: { statusCode: "delivered", timestamp: "2026-10-03T10:00:00Z" }, origin: { address: { addressLocality: "Delhi" } }, destination: { address: { addressLocality: "Berlin" } },
    events: [{ timestamp: "2026-10-01T08:00:00Z", statusCode: "transit", description: "Departed facility" }, { timestamp: "2026-10-03T10:00:00Z", statusCode: "delivered", description: "Delivered" }] } }, "1234567890");
    expect(n.currentStatus).toBe("DELIVERED"); expect(n.events[0].status).toBe("IN_TRANSIT"); });
  it("ups detects 1Z and normalizes", async () => { expect((await ups.detect("1Z999AA10123456784")).confidence).toBeGreaterThan(0.9);
    const n = ups.normalize({ carrier: "ups", latencyMs: 1, payload: { activity: [{ date: "20261001", time: "090000", status: { type: "M", description: "Order Processed" } }, { date: "20261003", time: "141500", status: { type: "D", description: "Delivered" } }] } }, "1Z999AA10123456784");
    expect(n.currentStatus).toBe("DELIVERED"); expect(n.events[0].status).toBe("ORDER_CREATED"); });
});
import { buildWhere } from "@/lib/shipments-filter"; import { dayKey, weekdayLetter } from "@/lib/tz";
describe("filters and tz", () => {
  it("ignores bad status, handles mode", () => { expect(buildWhere({ status: "HACK" }).currentStatus).toBeUndefined(); expect(buildWhere({ status: "DELIVERED" }).currentStatus).toBe("DELIVERED"); expect(buildWhere({ mode: "test" }).carrierCode).toBe("vyoma_test"); });
  it("groups days in Indian time, not UTC", () => { const d = new Date("2026-10-05T20:00:00Z"); expect(dayKey(d, "Asia/Kolkata")).toBe("2026-10-06"); expect(dayKey(d, "UTC")).toBe("2026-10-05"); expect(weekdayLetter(d, "Asia/Kolkata")).toBe("T"); });
});
import { ship24 } from "@/lib/carriers/ship24";
describe("ship24", () => {
  it("maps milestones and keeps finer states", () => {
    const n = ship24.normalize({ carrier: "ship24", latencyMs: 1, payload: { shipment: { statusMilestone: "delivered", originCountryCode: "IN", recipient: { city: "Bengaluru" }, destinationCountryCode: "IN" },
      events: [{ occurrenceDatetime: "2026-10-01T08:00:00Z", status: "Picked up by courier", statusMilestone: "in_transit", courierCode: "delhivery" }, { occurrenceDatetime: "2026-10-03T08:00:00Z", status: "Delivered", statusMilestone: "delivered" }] } }, "123456789012");
    expect(n.currentStatus).toBe("DELIVERED"); expect(n.events[0].status).toBe("PICKED_UP"); expect(n.carrier.name).toContain("delhivery"); });
  it("is a fallback, never a sure detection", async () => { expect((await ship24.detect("X")).confidence).toBeLessThan(0.6); });
});
describe("via ship24", () => { it("routes carriers without adapters to Ship24, which is not configured here", async () => {
  delete process.env.SHIP24_API_KEY; for (const c of ["ekart", "shadowfax", "dtdc"]) await expect(track("123456789012", c)).rejects.toMatchObject({ code: "UNSUPPORTED_CARRIER" }); }); });
