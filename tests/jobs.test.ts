import { describe, it, expect } from "vitest";
import { backoffMinutes } from "@/lib/seller/backoff";
import { eventFor } from "@/lib/seller/events";
import { quote, rank, type Card } from "@/lib/seller/recommend";
const card = (o: Partial<Card> = {}): Card => ({ courier: "A", baseRate: 40, baseKg: 0.5, extraRate: 30, extraKg: 0.5, codFee: 25, codPercent: 2, etaDays: 4, maxKg: null, codAllowed: true, pincodePrefixes: [], ...o });
describe("job backoff", () => { it("doubles then caps at 60", () => { expect(backoffMinutes(1)).toBe(2); expect(backoffMinutes(3)).toBe(8); expect(backoffMinutes(10)).toBe(60); }); });
describe("notification events", () => {
  it("maps statuses to customer messages", () => { expect(eventFor("OUT_FOR_DELIVERY", null)).toBe("out_for_delivery"); expect(eventFor("DELIVERED", "out_for_delivery")).toBe("delivered"); expect(eventFor("EXCEPTION", null)).toBe("attempt_failed"); });
  it("never repeats the same event", () => expect(eventFor("OUT_FOR_DELIVERY", "out_for_delivery")).toBeNull());
  it("announces dispatch once, from the first transit status", () => { expect(eventFor("IN_TRANSIT", null)).toBe("dispatched"); expect(eventFor("IN_TRANSIT", "dispatched")).toBeNull(); });
  it("ignores statuses that need no message", () => expect(eventFor("AT_DESTINATION_HUB", "dispatched")).toBeNull());
});
describe("courier quotes", () => {
  it("adds extra slabs and COD charges from the seller's rate card", () => expect(quote(card(), { weightKg: 1.2, pincode: "560001", cod: true, amount: 1000 }).cost).toBe(145)); // 40 + 2 slabs x 30 + 25 + 2% of 1000
  it("charges only the base rate within the base weight", () => expect(quote(card(), { weightKg: 0.4, pincode: "560001", cod: false, amount: 0 }).cost).toBe(40));
  it("rejects couriers that cannot take the parcel and says why", () => {
    const s = { weightKg: 6, pincode: "560001", cod: true, amount: 100 };
    expect(quote(card({ maxKg: 5 }), s).reasons[0]).toMatch(/5 kg limit/); expect(quote(card({ codAllowed: false }), s).reasons).toContain("Does not offer COD");
    expect(quote(card({ pincodePrefixes: ["11"] }), s).eligible).toBe(false); expect(quote(card({ pincodePrefixes: ["56"] }), { ...s, weightKg: 1 }).eligible).toBe(true); });
});
describe("courier ranking", () => {
  const cards = [card({ courier: "Cheap", baseRate: 30, etaDays: 6 }), card({ courier: "Fast", baseRate: 70, etaDays: 2 }), card({ courier: "Blocked", maxKg: 0.1 })]; const s = { weightKg: 0.4, pincode: "560001", cod: false, amount: 0 };
  it("picks the cheapest", () => expect(rank(cards, s, () => null, "cheapest").ranked[0].courier).toBe("Cheap"));
  it("picks the fastest", () => expect(rank(cards, s, () => null, "fastest").ranked[0].courier).toBe("Fast"));
  it("keeps ineligible couriers out of the ranking but lists them", () => { const r = rank(cards, s, () => null, "best"); expect(r.ranked.map(x => x.courier)).not.toContain("Blocked"); expect(r.rejected[0].courier).toBe("Blocked"); });
  it("uses delivery data only when it exists", () => { const r = rank([card({ courier: "X" }), card({ courier: "Y" })], s, c => (c === "Y" ? { done: 40, deliveryPct: 95 } : null), "best"); expect(r.ranked[0].courier).toBe("Y"); });
});
import { parseBearer, KEY_RE } from "@/lib/seller/apikey-format";
describe("API key format", () => {
  const good = "vr_live_" + "a".repeat(32);
  it("accepts a well-formed bearer key", () => { expect(parseBearer(`Bearer ${good}`)).toBe(good); expect(KEY_RE.test(good)).toBe(true); });
  it("rejects missing, malformed or wrong-prefix keys", () => { expect(parseBearer(null)).toBeNull(); expect(parseBearer("Bearer abc")).toBeNull(); expect(parseBearer(`Basic ${good}`)).toBeNull(); expect(parseBearer(`Bearer sk_live_${"a".repeat(32)}`)).toBeNull(); expect(parseBearer(`Bearer ${good}x`)).toBeNull(); });
});
