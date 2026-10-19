import { describe, it, expect } from "vitest";
import { assessRisk, bucket } from "@/lib/seller/risk";
import { readCsv, cell, num } from "@/lib/seller/csv";
import { activePlan, PLANS } from "@/lib/seller/plans";
import { chargeableWeight } from "@/lib/seller/weight";
describe("RTO risk", () => {
  it("rates a clean prepaid order Low", () => expect(assessRisk({ paymentType: "PREPAID", amount: 900, phone: "9876543210", pincode: "560001" }).level).toBe("LOW"));
  it("rates a high-value COD order Medium and explains why", () => { const r = assessRisk({ paymentType: "COD", amount: 5000, phone: "9876543210", pincode: "560001" }); expect(r.level).toBe("MEDIUM"); expect(r.reasons.join()).toMatch(/High COD value/); });
  it("rates COD with a bad pincode High", () => expect(assessRisk({ paymentType: "COD", amount: 500, phone: "9876543210", pincode: "12" }).level).toBe("HIGH"));
  it("flags an invalid phone", () => expect(assessRisk({ paymentType: "PREPAID", amount: 1, phone: "123", pincode: "560001" }).reasons).toContain("Phone number looks invalid"));
});
describe("status buckets", () => { it("maps carrier statuses", () => { expect(bucket("DELIVERED")).toBe("DELIVERED"); expect(bucket("RTO")).toBe("RTO"); expect(bucket("EXCEPTION")).toBe("NDR"); expect(bucket("IN_TRANSIT")).toBe("IN_TRANSIT"); }); });
describe("CSV", () => {
  it("reads quoted fields and normalises headers", () => { const r = readCsv('Order No,Customer Name\n"A-1","Rao, Asha"\n'); expect(r[0].orderno).toBe("A-1"); expect(r[0].customername).toBe("Rao, Asha"); });
  it("returns nothing for an empty file", () => expect(readCsv("")).toEqual([]));
  it("neutralises formula injection in exports", () => { expect(cell("=SUM(A1)")).toBe(`"'=SUM(A1)"`); expect(cell("@cmd")).toBe(`"'@cmd"`); expect(cell(-50)).toBe('"-50"'); expect(cell('a"b')).toBe('"a""b"'); });
  it("parses rupee amounts", () => { expect(num("₹1,499.50")).toBe(1499.5); expect(num("abc")).toBeNaN(); });
});
describe("plans", () => {
  const future = new Date(Date.now() + 864e5), past = new Date(Date.now() - 864e5);
  it("keeps an active paid plan", () => expect(activePlan({ plan: "GROWTH", planUntil: future })).toBe("GROWTH"));
  it("drops an expired plan to FREE", () => expect(activePlan({ plan: "SCALE", planUntil: past })).toBe("FREE"));
  it("treats unknown or missing plans as FREE", () => { expect(activePlan({ plan: "HACK", planUntil: future })).toBe("FREE"); expect(activePlan({ plan: "GROWTH", planUntil: null })).toBe("FREE"); });
  it("has increasing order limits", () => expect(PLANS.FREE.orders < PLANS.GROWTH.orders && PLANS.GROWTH.orders < PLANS.SCALE.orders).toBe(true));
});
describe("weight", () => {
  it("uses volumetric weight when higher, rounded up to the slab", () => { const r = chargeableWeight(30, 20, 15, 1, 5000, 0.5); expect(r.vol).toBeCloseTo(1.8); expect(r.charge).toBe(2); });
  it("uses actual weight when higher", () => expect(chargeableWeight(10, 10, 10, 2.2, 5000, 0.5).charge).toBe(2.5));
  it("does not over-round an exact slab multiple", () => expect(chargeableWeight(50, 40, 5, 0.5, 5000, 0.5).charge).toBe(2));
});
