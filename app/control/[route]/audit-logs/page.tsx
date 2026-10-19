import { pageGuard } from "@/lib/auth/guard"; import { prisma } from "@/lib/db/prisma";
export const dynamic = "force-dynamic";
export default async function P({ params }: { params: Promise<{ route: string }> }) { await pageGuard((await params).route, "logs");
  const rows = await prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
  return (<div className="p-5 md:p-8 mx-auto w-full max-w-6xl"><h1 className="text-3xl font-bold mb-6">Audit Logs</h1><div className="rounded-3xl border border-line bg-card/80 backdrop-blur overflow-x-auto p-2"><table className="w-full text-sm"><thead className="text-left text-muted"><tr><th className="py-2">Time</th><th>Actor</th><th>Action</th><th>Resource</th><th>IP</th></tr></thead>
    <tbody>{rows.map(r => <tr key={r.id} className="border-t border-line"><td className="py-2">{r.createdAt.toLocaleString()}</td><td>{r.actor}</td><td>{r.action}</td><td>{r.resource ?? ""} {r.resourceId ?? ""}</td><td>{r.ip}</td></tr>)}</tbody></table></div></div>); }
