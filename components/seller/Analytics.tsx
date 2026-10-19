"use client";
import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { cell } from "@/lib/seller/csv";
type O = { orderNo: string; paymentType: string; awb: string | null; carrierCode: string | null; carrierName: string | null; status: string; createdAt: string; shippedAt: string | null; deliveredAt: string | null };
const RANGES = [[7, "7 days"], [30, "30 days"], [90, "90 days"], [0, "All time"]] as const;
const PAY = [["ALL", "All payments"], ["COD", "COD"], ["PREPAID", "Prepaid"]] as const;
// Definitions (shown to the seller): "shipped" = has a tracking number and was refreshed at least once. Success rates use COMPLETED
// shipments only (delivered + returned), so parcels still on the way are never counted as failures.
export function stats(list: O[], ndrNos: Set<string>) {
  const shipped = list.filter(o => o.awb && o.status !== "NEW"); const del = shipped.filter(o => o.status === "DELIVERED"); const rto = shipped.filter(o => o.status === "RTO"); const done = del.length + rto.length;
  const days = del.flatMap(o => o.shippedAt && o.deliveredAt ? [(+new Date(o.deliveredAt) - +new Date(o.shippedAt)) / 864e5] : []);
  const ndr = shipped.filter(o => o.status === "NDR" || ndrNos.has(o.orderNo)).length;
  return { shipped: shipped.length, delivered: del.length, rto: rto.length, inTransit: shipped.length - done, done, ndr, timed: days.length,
    deliveryPct: done ? (del.length / done) * 100 : null, rtoPct: done ? (rto.length / done) * 100 : null, ndrPct: shipped.length ? (ndr / shipped.length) * 100 : null, avgDays: days.length ? days.reduce((a, b) => a + b, 0) / days.length : null };
}
const pct = (v: number | null) => v == null ? "—" : `${Math.round(v)}%`; const dd = (v: number | null) => v == null ? "—" : `${v.toFixed(1)} days`;
const conf = (n: number) => n < 10 ? ["Low sample", "text-amber-600 dark:text-amber-400"] : n < 30 ? ["Medium sample", "text-muted"] : ["Good sample", "text-emerald-600 dark:text-emerald-400"];

export default function Analytics({ orders, cases }: { orders: O[]; cases: { orderNo: string }[] }) {
  const [days, setDays] = useState<number>(30); const [pay, setPay] = useState<string>("ALL");
  const ndrNos = useMemo(() => new Set(cases.map(c => c.orderNo)), [cases]);
  const list = useMemo(() => orders.filter(o => (!days || Date.now() - +new Date(o.createdAt) <= days * 864e5) && (pay === "ALL" || o.paymentType === pay)), [orders, days, pay]);
  const total = useMemo(() => stats(list, ndrNos), [list, ndrNos]);
  const rows = useMemo(() => { const g = new Map<string, O[]>(); for (const o of list) { const k = o.carrierName ?? o.carrierCode ?? "Unknown courier"; g.set(k, [...(g.get(k) ?? []), o]); }
    return [...g.entries()].map(([name, l]) => ({ name, ...stats(l, ndrNos) })).filter(r => r.shipped > 0).sort((a, b) => b.shipped - a.shipped); }, [list, ndrNos]);
  const exp = () => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([["Courier,Shipped,Completed,Delivery %,RTO %,NDR %,Avg transit days,In transit", ...rows.map(r => [cell(r.name), r.shipped, r.done, r.deliveryPct?.toFixed(1) ?? "", r.rtoPct?.toFixed(1) ?? "", r.ndrPct?.toFixed(1) ?? "", r.avgDays?.toFixed(1) ?? "", r.inTransit].join(","))].join("\n")], { type: "text/csv" })); a.download = "courier-analytics.csv"; a.click(); URL.revokeObjectURL(a.href); };
  const pill = (on: boolean) => `shrink-0 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm transition ${on ? "border-brand/50 bg-brand/10 font-medium text-brand" : "border-line text-muted hover:text-fg"}`;
  const tiles = [["Shipped", String(total.shipped), ""], ["Delivery rate", pct(total.deliveryPct), "text-emerald-500"], ["RTO rate", pct(total.rtoPct), "text-red-500"], ["NDR rate", pct(total.ndrPct), "text-amber-500"], ["Avg transit", dd(total.avgDays), ""], ["On the way", String(total.inTransit), "text-brand"]];
  const Bar = ({ v, c }: { v: number | null; c: string }) => <div className="h-1.5 w-full overflow-hidden rounded-full bg-line"><div className={`h-full rounded-full ${c}`} style={{ width: `${v ?? 0}%` }} /></div>;
  return (<section className="space-y-5" aria-label="Courier analytics">
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label="Period">{RANGES.map(([d, l]) => <button key={d} aria-pressed={days === d} onClick={() => setDays(d)} className={pill(days === d)}>{l}</button>)}</div>
      <div className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label="Payment type">{PAY.map(([k, l]) => <button key={k} aria-pressed={pay === k} onClick={() => setPay(k)} className={pill(pay === k)}>{l}</button>)}
        <button onClick={exp} disabled={!rows.length} className="inline-flex shrink-0 items-center gap-2 rounded-full border border-line px-3.5 py-1.5 text-sm text-muted transition hover:text-fg disabled:opacity-40"><Download size={14} />Export</button></div></div>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">{tiles.map(([l, v, c]) => <div key={l} className="rounded-2xl border border-line bg-card/70 p-4 backdrop-blur"><div className="text-xs text-muted">{l}</div><div className={`mt-1 text-2xl font-bold ${c}`}>{v}</div></div>)}</div>
    {!rows.length ? <div className="rounded-2xl border border-dashed border-line p-10 text-center text-sm text-muted">No shipped orders in this period yet. Add tracking numbers to your orders and press Refresh, then come back here.</div> : <>
      <div className="hidden overflow-x-auto rounded-2xl border border-line bg-card/70 md:block"><table className="w-full text-left text-sm"><thead className="text-xs text-muted"><tr className="border-b border-line">{["Courier", "Shipped", "Delivery rate", "RTO rate", "NDR rate", "Avg transit", "Data quality"].map(h => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-line">{rows.map(r => { const [cl, cc] = conf(r.done); return <tr key={r.name}><td className="px-4 py-3 font-medium">{r.name}</td><td className="px-4 py-3">{r.shipped}<div className="text-xs text-muted">{r.inTransit} on the way</div></td>
          <td className="w-40 px-4 py-3"><b>{pct(r.deliveryPct)}</b><Bar v={r.deliveryPct} c="bg-emerald-500" /></td><td className="w-40 px-4 py-3"><b>{pct(r.rtoPct)}</b><Bar v={r.rtoPct} c="bg-red-500" /></td><td className="px-4 py-3">{pct(r.ndrPct)}</td><td className="px-4 py-3">{dd(r.avgDays)}<div className="text-xs text-muted">{r.timed} timed</div></td><td className={`px-4 py-3 text-xs ${cc}`}>{cl}<div className="text-muted">{r.done} completed</div></td></tr>; })}</tbody></table></div>
      <ul className="space-y-3 md:hidden">{rows.map(r => { const [cl, cc] = conf(r.done); return <li key={r.name} className="rounded-2xl border border-line bg-card/70 p-4 backdrop-blur"><div className="flex items-start justify-between gap-3"><div className="min-w-0 truncate font-semibold">{r.name}</div><span className={`shrink-0 text-xs ${cc}`}>{cl}</span></div>
        <div className="mt-1 text-xs text-muted">{r.shipped} shipped · {r.inTransit} on the way · {r.done} completed</div>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm"><div><div className="text-xs text-muted">Delivery</div><b>{pct(r.deliveryPct)}</b><Bar v={r.deliveryPct} c="bg-emerald-500" /></div><div><div className="text-xs text-muted">RTO</div><b>{pct(r.rtoPct)}</b><Bar v={r.rtoPct} c="bg-red-500" /></div><div><div className="text-xs text-muted">NDR</div><b>{pct(r.ndrPct)}</b></div><div><div className="text-xs text-muted">Avg transit</div><b>{dd(r.avgDays)}</b></div></div></li>; })}</ul></>}
    <p className="text-xs leading-relaxed text-muted">How to read this: delivery and RTO rates use <b>completed</b> shipments only (delivered or returned), so parcels still on the way are not counted as failures. NDR rate is the share of shipped orders that had a failed delivery attempt. Transit time runs from the first courier scan to delivery. Small samples can mislead, so check the data-quality label before choosing a courier.</p>
  </section>);
}
