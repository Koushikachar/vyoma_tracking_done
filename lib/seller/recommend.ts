// Courier comparison from the seller's OWN rate cards. It never invents rates, ETAs or success rates: unknown delivery data is shown as unknown.
export type Card = { courier: string; baseRate: number; baseKg: number; extraRate: number; extraKg: number; codFee: number; codPercent: number; etaDays: number; maxKg: number | null; codAllowed: boolean; pincodePrefixes: string[] };
export type Ship = { weightKg: number; pincode: string; cod: boolean; amount: number };
export type Perf = { done: number; deliveryPct: number | null };
export type Quote = { courier: string; eligible: boolean; reasons: string[]; cost: number; etaDays: number; parts: string; perf: Perf | null };
export type Mode = "cheapest" | "fastest" | "best";
const r2 = (n: number) => Math.round(n * 100) / 100;
export function quote(c: Card, s: Ship, perf: Perf | null = null): Quote {
  const reasons: string[] = [];
  if (c.maxKg != null && s.weightKg > c.maxKg) reasons.push(`Over this courier's ${c.maxKg} kg limit`);
  if (s.cod && !c.codAllowed) reasons.push("Does not offer COD");
  if (c.pincodePrefixes.length && !c.pincodePrefixes.some(p => s.pincode.startsWith(p))) reasons.push("Pincode is outside your listed service area");
  const extra = Math.ceil(Math.max(0, s.weightKg - c.baseKg) / Math.max(c.extraKg, 0.01)); const cod = s.cod ? c.codFee + (s.amount * c.codPercent) / 100 : 0;
  return { courier: c.courier, eligible: reasons.length === 0, reasons, cost: r2(c.baseRate + extra * c.extraRate + cod), etaDays: c.etaDays, perf,
    parts: `₹${c.baseRate} base${extra ? ` + ${extra} extra slab${extra > 1 ? "s" : ""} × ₹${c.extraRate}` : ""}${s.cod ? ` + COD ₹${r2(cod)}` : ""}` };
}
export function rank(cards: Card[], s: Ship, perf: (courier: string) => Perf | null, mode: Mode) {
  const qs = cards.map(c => quote(c, s, perf(c.courier))); const ranked = qs.filter(q => q.eligible), rejected = qs.filter(q => !q.eligible);
  const lo = (f: (q: Quote) => number) => Math.min(...ranked.map(f)), hi = (f: (q: Quote) => number) => Math.max(...ranked.map(f));
  const norm = (v: number, a: number, b: number) => (b === a ? 0 : (v - a) / (b - a));
  const score = (q: Quote) => mode === "cheapest" ? q.cost + q.etaDays / 1000 : mode === "fastest" ? q.etaDays + q.cost / 1e6
    : 0.5 * norm(q.cost, lo(x => x.cost), hi(x => x.cost)) + 0.3 * norm(q.etaDays, lo(x => x.etaDays), hi(x => x.etaDays)) + 0.2 * (q.perf?.deliveryPct == null ? 0.5 : 1 - q.perf.deliveryPct / 100);
  return { ranked: ranked.sort((a, b) => score(a) - score(b)), rejected };
}
