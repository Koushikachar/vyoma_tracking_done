import Link from "next/link";
import { pageGuard } from "@/lib/auth/guard"; import { prisma } from "@/lib/db/prisma"; import { getSettings } from "@/lib/settings"; import { fmt } from "@/lib/tz";
import Replay from "@/components/admin/Replay"; import { Badge, PageHeader, panel } from "@/components/admin/ui";
export const dynamic = "force-dynamic";
const TONE: Record<string, "ok" | "warn" | "bad" | "mute"> = { processed: "ok", pending: "mute", failed: "warn", dead: "bad" };
export default async function P({ params, searchParams }: { params: Promise<{ route: string }>; searchParams: Promise<{ status?: string }> }) {
  const { route } = await params; await pageGuard(route, "webhooks"); const st = (await searchParams).status; const tz = (await getSettings()).timeZone;
  const [rows, counts] = await Promise.all([prisma.webhookEvent.findMany({ where: st && st in TONE ? { status: st } : {}, orderBy: { receivedAt: "desc" }, take: 100 }), prisma.webhookEvent.groupBy({ by: ["status"], _count: true })]);
  const n = (s: string) => counts.find(c => c.status === s)?._count ?? 0;
  return (<div className="p-5 md:p-8 space-y-6 mx-auto w-full max-w-6xl"><PageHeader title="Webhooks" sub="Carrier events are signature-checked, de-duplicated and retried with exponential backoff. After 5 failed attempts an event is dead-lettered until you replay it." />
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{Object.keys(TONE).map(s => <Link key={s} href={`?status=${s}`} className={`${panel} p-4 hover:-translate-y-0.5 transition ${st === s ? "ring-2 ring-brand" : ""}`}><div className="text-3xl font-bold">{n(s)}</div><div className="text-sm text-muted capitalize">{s}</div></Link>)}</div>
    {st && <Link href="?" className="text-sm text-brand">Clear filter</Link>}
    <div className={`${panel} overflow-x-auto`}><table className="w-full text-sm"><thead className="text-left text-muted"><tr><th className="p-4">Received</th><th>Carrier</th><th>Event</th><th>Status</th><th>Attempts</th><th>Next retry</th><th>Error</th><th></th></tr></thead>
      <tbody>{rows.map(r => <tr key={r.id} className="border-t border-line"><td className="p-4">{fmt(r.receivedAt, tz)}</td><td>{r.carrier}</td><td className="font-mono">{r.eventId}</td><td><Badge tone={TONE[r.status] ?? "mute"}>{r.status}</Badge></td><td>{r.attempts}</td>
        <td>{r.status === "failed" && r.nextAttemptAt ? fmt(r.nextAttemptAt, tz) : "—"}</td><td className="max-w-48 truncate">{r.error}</td><td className="pr-4">{(r.status === "failed" || r.status === "dead") && <Replay id={r.id} />}</td></tr>)}
        {rows.length === 0 && <tr><td colSpan={8} className="p-8 text-center text-muted">No webhook events yet.</td></tr>}</tbody></table></div>
    <details className={`${panel} p-6 text-sm`}><summary className="cursor-pointer font-semibold">How to receive carrier webhooks</summary><div className="mt-3 space-y-2 text-muted"><p>Endpoint: <code>POST /api/v1/webhooks/&lt;carrier&gt;</code> (for example <code>delhivery</code>).</p>
      <p>Set <code>WEBHOOK_SECRET_&lt;CARRIER&gt;</code> in your environment. Without it the endpoint returns 404, so unconfigured carriers aren’t exposed.</p><p>Sign the body as HMAC-SHA256 of <code>{"{timestamp}.{rawBody}"}</code> and send headers <code>x-vyoma-timestamp</code> (ms) and <code>x-vyoma-signature</code> (hex). The JSON needs <code>eventId</code>, <code>trackingId</code> and <code>status</code>. Requests older than 5 minutes are rejected.</p></div></details></div>); }
