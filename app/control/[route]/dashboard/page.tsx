import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, FlaskConical, KeyRound, AlertTriangle, CheckCircle2 } from "lucide-react";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { can } from "@/lib/auth/rbac";
import { activeAlerts } from "@/lib/alerts";
import { dayKey, fmt, weekdayLetter } from "@/lib/tz";
import { getSettings } from "@/lib/settings";
import { loadCredentials } from "@/lib/carriers/credentials";
import { listAdapters } from "@/lib/carriers/registry";
import { Reveal, CountUp } from "@/components/admin/Reveal";
import WeekBars from "@/components/admin/WeekBars";
import DeliveryDonut from "@/components/admin/DeliveryDonut";
import TrendsCard from "@/components/admin/TrendsCard";
import { getTrends } from "@/lib/trends";
export const dynamic = "force-dynamic"; export const metadata = { title: "Dashboard", robots: { index: false, follow: false } };
const RANGES: Record<string, number | null> = { today: 1, "7d": 7, "30d": 30, "90d": 90, all: null };
const DAY = 86400_000; const card = "rounded-3xl border border-line bg-card/80 backdrop-blur p-6";
export default async function Dashboard({ params, searchParams }: { params: Promise<{ route: string }>; searchParams: Promise<{ range?: string }> }) {
  const { route } = await params; const s = await getSession(); if (!s) redirect(`/control/${route}/login`);
  if (!can(s.user.role, "dashboard") && !can(s.user.role, "analytics")) return <p className="p-10">Not authorized.</p>;
  const q = (await searchParams).range ?? "7d"; const range = q in RANGES ? q : "7d"; const days = RANGES[range]; const since = days ? new Date(Date.now() - days * DAY) : null; const d1 = new Date(Date.now() - DAY); const d7 = new Date(Date.now() - 7 * DAY);
  await loadCredentials(); const cfg = await getSettings(); const tz = cfg.timeZone; const alerts = await activeAlerts(); const adapters = listAdapters(); const live = adapters.filter(a => a.isConfigured()).length;
  const [total, l24, f24, avg, byStatus, recent, series, week, byCarrier, badHooks, excepts, msgs] = await Promise.all([
    prisma.shipment.count(), prisma.trackingLookup.count({ where: { createdAt: { gte: d1 } } }), prisma.trackingLookup.count({ where: { createdAt: { gte: d1 }, success: false } }),
    prisma.trackingLookup.aggregate({ _avg: { latencyMs: true }, where: { success: true } }), prisma.shipment.groupBy({ by: ["currentStatus"], _count: true, where: since ? { createdAt: { gte: since } } : {} }),
    prisma.trackingLookup.findMany({ orderBy: { createdAt: "desc" }, take: 6 }),
    getTrends("7d", tz),
    prisma.trackingLookup.findMany({ where: { createdAt: { gte: d7 } }, select: { createdAt: true } }),
    prisma.trackingLookup.groupBy({ by: ["carrierCode", "success"], _count: true, where: { createdAt: { gte: d1 }, carrierCode: { not: null } } }),
    prisma.webhookEvent.count({ where: { status: { in: ["failed", "dead"] } } }), prisma.shipment.count({ where: { currentStatus: "EXCEPTION" } }), prisma.contactMessage.count({ where: { createdAt: { gte: d7 } } })]);
  const wk = Array.from({ length: 7 }, (_, i) => { const d = new Date(Date.now() - (6 - i) * DAY); const k = dayKey(d, tz); return { k, day: weekdayLetter(d, tz), lookups: week.filter(w => dayKey(w.createdAt, tz) === k).length }; });
  const cnt = (...st: string[]) => byStatus.filter(b => st.includes(b.currentStatus)).reduce((a, b) => a + b._count, 0);
  const delivered = cnt("DELIVERED"), issues = cnt("EXCEPTION", "DELIVERY_ATTEMPTED", "RTO", "RETURNED"), progress = byStatus.reduce((a, b) => a + b._count, 0) - delivered - issues;
  const carriers = [...new Set(byCarrier.map(c => c.carrierCode!))].map(c => { const ok = byCarrier.find(x => x.carrierCode === c && x.success)?._count ?? 0; const bad = byCarrier.find(x => x.carrierCode === c && !x.success)?._count ?? 0; return { c, n: ok + bad, rate: ok / (ok + bad) }; });
  const rate = l24 ? Math.round((f24 / l24) * 100) : 0; const hello = new Date().getUTCHours() < 12 ? "Good morning" : "Good day";
  const stats: [string, number, string, string, string][] = [["Shipments tracked", total, "", "shipments", "hero"], ["Lookups in 24h", l24, "", "tracking-lab", ""], ["Failure rate", rate, "%", "carrier-health", ""], ["Avg carrier response", Math.round(avg._avg.latencyMs ?? 0), " ms", "carrier-health", ""]];
  return (<div className="p-5 md:p-8 space-y-6 mx-auto w-full max-w-7xl">
    <Reveal className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-3xl font-bold">{hello}, {s.user.email.split("@")[0]}</h1><p className="text-muted mt-1">Everything VYOMA ROUTE has tracked, and how healthy the carrier connections are.</p></div>
      <div className="flex gap-2"><Link href={`/control/${route}/tracking-lab`} className="inline-flex items-center gap-2 rounded-full admin-hero px-5 py-2.5 text-sm font-semibold"><FlaskConical size={16} />Tracking Lab</Link>
        <Link href={`/control/${route}/api-keys`} className="inline-flex items-center gap-2 rounded-full border border-line bg-card px-5 py-2.5 text-sm font-semibold"><KeyRound size={16} />API keys</Link></div></Reveal>
    {alerts.length > 0 && <Reveal><div role="alert" className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-5 py-3 text-sm flex items-start gap-3"><AlertTriangle size={18} className="text-amber-500 mt-0.5" />
      <div>{alerts.map(a => <div key={a.carrier}><b>{a.carrier}</b>: only {a.rate}% of recent lookups succeeded. Check <Link className="underline" href={`/control/${route}/carrier-health`}>Carrier Health</Link>.</div>)}</div></div></Reveal>}
    <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">{stats.map(([l, v, suf, href, hero], i) => <Reveal key={l} i={i}><Link href={`/control/${route}/${href}`} className={`block rounded-3xl p-6 h-full transition hover:-translate-y-0.5 ${hero ? "admin-hero shadow-lg shadow-brand/30" : "border border-line bg-card/80"}`}>
      <div className="flex justify-between text-sm opacity-80"><span>{l}</span><ArrowUpRight size={18} /></div><div className="mt-3 text-5xl font-bold"><CountUp to={v} suffix={suf} /></div></Link></Reveal>)}</div>
    <div className="grid lg:grid-cols-3 gap-4">
      <Reveal i={4} className={`${card} lg:col-span-2`}><h2 className="font-semibold">Lookup analytics</h2><p className="text-xs text-muted">Last 7 days ({tz})</p><WeekBars data={wk} /></Reveal>
      <Reveal i={5} className={card}><h2 className="font-semibold mb-3">Needs attention</h2><ul className="space-y-3 text-sm">
        {[[badHooks, "failed webhooks", "webhooks"], [excepts, "shipments in exception", "shipments"], [msgs, "contact messages this week", "contact-messages"]].map(([n, t, h]) => <li key={t as string}><Link href={`/control/${route}/${h}`} className="flex items-center gap-3 rounded-2xl border border-line px-4 py-3 hover:bg-line/40">
          {(n as number) ? <AlertTriangle size={18} className="text-amber-500" /> : <CheckCircle2 size={18} className="text-brand" />}<span><b>{n as number}</b> {t as string}</span></Link></li>)}</ul></Reveal></div>
    <div className="grid lg:grid-cols-3 gap-4">
      <Reveal i={6} className={card}><h2 className="font-semibold mb-3">Carrier health (24h)</h2>{carriers.length === 0 ? <p className="text-sm text-muted">No live lookups yet.</p> : <ul className="space-y-4">{carriers.map(c => <li key={c.c}><div className="flex justify-between text-sm"><b>{c.c}</b><span className="text-muted">{c.n} lookups · {Math.round(c.rate * 100)}%</span></div>
        <div className="mt-1.5 h-2 rounded-full bg-line"><div className="h-2 rounded-full" style={{ width: `${c.rate * 100}%`, background: c.rate >= 0.95 ? "rgb(var(--brand))" : c.rate >= 0.7 ? "#f59e0b" : "#ef4444" }} /></div></li>)}</ul>}</Reveal>
      <Reveal i={7} className={card}><h2 className="font-semibold">Shipment outcomes</h2><DeliveryDonut delivered={delivered} progress={progress} issues={issues} /></Reveal>
      <Reveal i={8} className={card}><h2 className="font-semibold mb-3">System</h2><dl className="space-y-3 text-sm">{[["Database", "Connected"], ["Carriers live", `${live} of ${adapters.length}`], ["Maintenance mode", cfg.maintenanceMode ? "ON" : "Off"], ["Cache", `${cfg.cacheSeconds}s`], ["Log retention", `${cfg.retentionDays} days`]].map(([k, v]) => <div key={k} className="flex justify-between"><dt className="text-muted">{k}</dt><dd className="font-medium">{v}</dd></div>)}</dl></Reveal></div>
    <Reveal i={9} className={card}><TrendsCard initial={series} /></Reveal>
    <Reveal i={10} className={card}><h2 className="font-semibold mb-3">Recent lookups</h2><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="text-left text-muted"><tr><th className="py-2">Time</th><th>ID hash</th><th>Carrier</th><th>Result</th><th>Source</th><th>Speed</th></tr></thead>
      <tbody>{recent.map(r => <tr key={r.id} className="border-t border-line"><td className="py-2.5">{fmt(r.createdAt, tz)}</td><td className="font-mono">{r.trackingIdHash}</td><td>{r.carrierCode ?? "—"}</td>
        <td><span className={`rounded-full px-2.5 py-0.5 text-xs ${r.success ? "bg-brand/15 text-brand" : "bg-red-500/15 text-red-500"}`}>{r.success ? "Success" : r.errorCode}</span></td><td>{r.source}</td><td>{r.latencyMs} ms</td></tr>)}</tbody></table></div></Reveal></div>);
}
