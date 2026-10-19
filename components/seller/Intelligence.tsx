"use client";
import { stats } from "@/components/seller/Analytics";
export type View = "today" | "orders" | "ndr" | "analytics" | "cod" | "weight" | "plans" | "connections" | "team" | "courier" | "notifications";
type O = { orderNo: string; paymentType: string; amount: number; awb: string | null; carrierCode: string | null; carrierName: string | null; status: string; riskLevel: string; createdAt: string; shippedAt: string | null; deliveredAt: string | null };
type C = { orderNo: string; status: string; createdAt: string };
type Insight = { id: string; sev: 0 | 1 | 2; title: string; detail: string; evidence: string[]; count: number; action: string; go: [View, string?] };
const SEV = [["High", "bg-red-500/15 text-red-500"], ["Medium", "bg-amber-500/15 text-amber-600 dark:text-amber-400"], ["Low", "bg-line text-muted"]] as const;
const DAY = 864e5;
// Rule-based and deterministic: every item lists the records behind it. Items disappear by themselves once the underlying data is fixed.
function build(orders: O[], cases: C[]): Insight[] {
  const out: Insight[] = []; const add = (i: Omit<Insight, "count"> & { count?: number }) => i.evidence.length || i.count ? out.push({ ...i, count: i.count ?? i.evidence.length }) : null;
  const replied = cases.filter(c => c.status === "CUSTOMER_REPLIED"); add({ id: "replied", sev: 0, title: `${replied.length} customer${replied.length === 1 ? "" : "s"} replied about a failed delivery`, detail: "These parcels are waiting for you to act.", evidence: replied.map(c => c.orderNo), action: "Ask the courier to re-attempt or fix the address, then mark each case resolved.", go: ["ndr"] });
  const risky = orders.filter(o => o.status === "NEW" && o.riskLevel === "HIGH"); add({ id: "risky", sev: 0, title: `${risky.length} high-risk order${risky.length === 1 ? "" : "s"} not shipped yet`, detail: "Invalid pincode or phone, or a large COD amount.", evidence: risky.map(o => o.orderNo), action: "Confirm the address and phone with the customer before dispatch.", go: ["orders", "HIGH"] });
  const stale = cases.filter(c => c.status === "OPEN" && Date.now() - +new Date(c.createdAt) > DAY); add({ id: "stale", sev: 1, title: `${stale.length} failed delivery case${stale.length === 1 ? "" : "s"} waiting over 24 hours`, detail: "The customer has not answered yet.", evidence: stale.map(c => c.orderNo), action: "Send the customer link again on WhatsApp.", go: ["ndr"] });
  const fresh = orders.filter(o => o.awb && o.status === "NEW"); add({ id: "fresh", sev: 1, title: `${fresh.length} shipment${fresh.length === 1 ? " has" : "s have"} never been refreshed`, detail: "Their status and analytics are unknown.", evidence: fresh.map(o => o.orderNo), action: "Press Refresh on each order.", go: ["orders", "NEW"] });
  const g = new Map<string, O[]>(); for (const o of orders) { const k = o.carrierName ?? o.carrierCode; if (k) g.set(k, [...(g.get(k) ?? []), o]); }
  for (const [k, l] of g) { const s = stats(l, new Set()); if (s.done >= 10 && s.deliveryPct != null && s.deliveryPct < 75) add({ id: `c-${k}`, sev: 1, title: `${k} delivered only ${Math.round(s.deliveryPct)}% of completed shipments`, detail: `Based on ${s.done} completed shipments.`, evidence: [], count: s.done, action: "Compare couriers in Analytics before your next batch.", go: ["analytics"] }); }
  const cod = orders.filter(o => o.paymentType === "COD" && o.status === "DELIVERED" && Date.now() - +new Date(o.deliveredAt ?? o.createdAt) > 10 * DAY);
  add({ id: "cod", sev: 1, title: `${cod.length} delivered COD order${cod.length === 1 ? "" : "s"} (₹${cod.reduce((s, o) => s + o.amount, 0).toLocaleString("en-IN")}) delivered over 10 days ago`, detail: "The money may not have reached you yet.", evidence: cod.map(o => o.orderNo), action: "Upload the courier's settlement file in the COD tab to check.", go: ["cod"] });
  const none = orders.filter(o => !o.awb && o.status === "NEW"); add({ id: "none", sev: 2, title: `${none.length} order${none.length === 1 ? " has" : "s have"} no tracking number`, detail: "They cannot be tracked or counted yet.", evidence: none.map(o => o.orderNo), action: "Add the AWB once the order ships.", go: ["orders", "NEW"] });
  return out.sort((a, b) => a.sev - b.sev);
}
export default function Intelligence({ orders, cases, go }: { orders: O[]; cases: C[]; go: (v: View, filter?: string) => void }) {
  const items = build(orders, cases);
  if (!orders.length) return <div className="rounded-2xl border border-dashed border-line p-10 text-center text-sm text-muted">Add or import some orders and your daily action list will appear here.</div>;
  if (!items.length) return <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-10 text-center"><div className="text-lg font-semibold">All clear today ✓</div><p className="mt-1 text-sm text-muted">Nothing needs your attention right now.</p></div>;
  return (<section className="space-y-3" aria-label="Today's actions"><p className="text-sm text-muted">{items.length} thing{items.length === 1 ? "" : "s"} need your attention, most urgent first. This list updates itself from your live data.</p>
    <ul className="space-y-3">{items.map(i => <li key={i.id} className="rounded-2xl border border-line bg-card/70 p-4 backdrop-blur sm:p-5"><div className="flex flex-wrap items-start justify-between gap-2"><h2 className="min-w-0 font-semibold">{i.title}</h2><span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs ${SEV[i.sev][1]}`}>{SEV[i.sev][0]}</span></div>
      <p className="mt-1 text-sm text-muted">{i.detail}</p>
      {i.evidence.length > 0 && <p className="mt-2 break-words text-xs text-muted">Orders: {i.evidence.slice(0, 5).join(", ")}{i.evidence.length > 5 ? ` and ${i.evidence.length - 5} more` : ""}</p>}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3"><p className="min-w-0 flex-1 text-sm">{i.action}</p><button onClick={() => go(i.go[0], i.go[1])} className="h-10 shrink-0 rounded-xl bg-brand px-4 text-sm font-semibold text-bg hover:opacity-90">Open</button></div></li>)}</ul></section>);
}
