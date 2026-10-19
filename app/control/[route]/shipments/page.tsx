import Link from "next/link";
import { Download, Search } from "lucide-react";
import { pageGuard } from "@/lib/auth/guard"; import { prisma } from "@/lib/db/prisma"; import { getSettings } from "@/lib/settings"; import { fmt } from "@/lib/tz";
import { buildWhere, STATUS_LIST, SP } from "@/lib/shipments-filter";
export const dynamic = "force-dynamic";
const PER = 25; const tone = (s: string) => s === "DELIVERED" ? "bg-brand/15 text-brand" : ["EXCEPTION", "DELIVERY_ATTEMPTED", "RTO", "RETURNED"].includes(s) ? "bg-amber-500/15 text-amber-600" : s === "UNKNOWN" ? "bg-line text-muted" : "bg-accent/20 text-fg";
export default async function P({ params, searchParams }: { params: Promise<{ route: string }>; searchParams: Promise<SP> }) {
  const { route } = await params; await pageGuard(route, "shipments.read"); const sp = await searchParams; const tz = (await getSettings()).timeZone;
  const where = buildWhere(sp); const page = Math.max(1, Number(sp.page) || 1);
  const [rows, total, carriers] = await Promise.all([prisma.shipment.findMany({ where, orderBy: { updatedAt: "desc" }, skip: (page - 1) * PER, take: PER }), prisma.shipment.count({ where }), prisma.shipment.findMany({ distinct: ["carrierCode"], select: { carrierCode: true, carrierName: true } })]);
  const qs = (o: Record<string, string | undefined>) => new URLSearchParams(Object.entries({ ...sp, ...o }).filter(([, v]) => v) as [string, string][]).toString(); const pages = Math.max(1, Math.ceil(total / PER));
  const i = "rounded-xl border border-line bg-card px-3 py-2 text-sm";
  return (<div className="p-5 md:p-8 space-y-5 mx-auto w-full max-w-7xl"><div className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-3xl font-bold">Shipments</h1><p className="text-muted text-sm">{total} matching</p></div>
    <a href={`/api/control/shipments/export?${qs({ page: undefined })}`} className="inline-flex items-center gap-2 rounded-full admin-hero px-5 py-2.5 text-sm font-semibold"><Download size={16} />Export CSV</a></div>
    <form className="rounded-3xl border border-line bg-card/80 backdrop-blur p-4 flex flex-wrap gap-2"><div className="relative"><Search size={15} className="absolute left-3 top-3 text-muted" /><input name="q" defaultValue={sp.q} placeholder="Tracking ID" className={`${i} pl-9`} /></div>
      <select name="status" defaultValue={sp.status ?? ""} className={i}><option value="">All statuses</option>{STATUS_LIST.map(s => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}</select>
      <select name="carrier" defaultValue={sp.carrier ?? ""} className={i}><option value="">All carriers</option>{carriers.map(c => <option key={c.carrierCode} value={c.carrierCode}>{c.carrierName}</option>)}</select>
      <select name="mode" defaultValue={sp.mode ?? ""} className={i}><option value="">Live + test</option><option value="live">Live only</option><option value="test">Test only</option></select>
      <input type="date" name="from" defaultValue={sp.from} className={i} aria-label="From" /><input type="date" name="to" defaultValue={sp.to} className={i} aria-label="To" />
      <button className="rounded-xl bg-brand text-bg px-4 py-2 text-sm font-semibold">Apply</button><Link href="?" className="rounded-xl border border-line px-4 py-2 text-sm">Reset</Link></form>
    <div className="rounded-3xl border border-line bg-card/80 backdrop-blur overflow-x-auto"><table className="w-full text-sm"><thead className="text-left text-muted"><tr><th className="p-4">Tracking ID</th><th>Carrier</th><th>Status</th><th>Route</th><th>Updated</th><th>Mode</th></tr></thead>
      <tbody>{rows.map(s => <tr key={s.id} className="border-t border-line hover:bg-line/30"><td className="p-4 font-mono"><Link className="text-brand" href={`/control/${route}/shipments/${s.id}`}>{s.trackingId}</Link></td><td>{s.carrierName}</td>
        <td><span className={`rounded-full px-2.5 py-0.5 text-xs ${tone(s.currentStatus)}`}>{s.currentStatus.replace(/_/g, " ")}</span></td><td>{s.origin ?? "—"} → {s.destination ?? "—"}</td><td>{fmt(s.lastUpdatedAt, tz)}</td><td>{s.carrierCode === "vyoma_test" ? "Test" : "Live"}</td></tr>)}
        {rows.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted">No shipments match these filters.</td></tr>}</tbody></table></div>
    <div className="flex items-center justify-between text-sm text-muted"><span>Page {page} of {pages}</span><div className="flex gap-2">
      {page > 1 && <Link className="rounded-xl border border-line px-4 py-2" href={`?${qs({ page: String(page - 1) })}`}>Previous</Link>}{page < pages && <Link className="rounded-xl border border-line px-4 py-2" href={`?${qs({ page: String(page + 1) })}`}>Next</Link>}</div></div></div>);
}
