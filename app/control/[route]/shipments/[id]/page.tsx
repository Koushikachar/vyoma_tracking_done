import { notFound } from "next/navigation";
import { pageGuard } from "@/lib/auth/guard"; import { prisma } from "@/lib/db/prisma"; import { hashId } from "@/lib/tracking/service"; import { audit } from "@/lib/logging/audit";
export const dynamic = "force-dynamic";
export default async function P({ params }: { params: Promise<{ route: string; id: string }> }) {
  const { route, id } = await params; const s = await pageGuard(route, "shipments.read");
  const sh = await prisma.shipment.findUnique({ where: { id }, include: { events: { orderBy: { eventTime: "asc" } } } }); if (!sh) notFound();
  const lookups = await prisma.trackingLookup.findMany({ where: { trackingIdHash: hashId(sh.trackingId) }, orderBy: { createdAt: "desc" }, take: 20 });
  const history = await prisma.auditLog.findMany({ where: { resource: "shipment", resourceId: id }, orderBy: { createdAt: "desc" }, take: 10 });
  await audit(s.user.email, "shipment.viewed", undefined, "shipment", id);
  return (<div className="p-8 mx-auto w-full max-w-5xl space-y-8"><div><h1 className="text-2xl font-bold font-mono">{sh.trackingId}</h1>
    <p className="text-muted text-sm">{sh.carrierName} · detection confidence {sh.detectionConfidence} · last carrier sync {sh.lastCarrierSyncAt?.toLocaleString() ?? "—"}</p>
    <p className="mt-2 text-xl text-brand">{sh.currentStatus.replace(/_/g, " ")} <span className="text-sm text-muted">(raw: {sh.currentStatusRaw})</span></p></div>
    <section><h2 className="font-semibold mb-2">Events (normalized + raw)</h2><table className="w-full text-sm"><thead className="text-left text-muted"><tr><th>Time</th><th>Normalized</th><th>Raw status</th><th>Description</th><th>Location</th><th>Source</th></tr></thead>
      <tbody>{sh.events.map(e => <tr key={e.id} className="border-t border-line"><td className="py-1">{e.eventTime.toLocaleString()}</td><td>{e.status}</td><td className="font-mono">{e.rawStatus}</td><td>{e.description}</td><td>{e.location}</td><td>{e.source}</td></tr>)}</tbody></table></section>
    <section><h2 className="font-semibold mb-2">Lookup history</h2><table className="w-full text-sm"><tbody>{lookups.map(l => <tr key={l.id} className="border-t border-line"><td className="py-1">{l.createdAt.toLocaleString()}</td><td>{l.success ? "Success" : l.errorCode}</td><td>{l.source}</td><td>{l.latencyMs} ms</td></tr>)}</tbody></table></section>
    <section><h2 className="font-semibold mb-2">Audit history</h2>{history.length === 0 ? <p className="text-sm text-muted">No admin actions recorded for this shipment yet.</p> :
      <ul className="text-sm">{history.map(h => <li key={h.id}>{h.createdAt.toLocaleString()} — {h.actor}: {h.action}</li>)}</ul>}</section></div>); }
