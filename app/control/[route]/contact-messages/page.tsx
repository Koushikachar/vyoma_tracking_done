import { pageGuard } from "@/lib/auth/guard"; import { prisma } from "@/lib/db/prisma";
export const dynamic = "force-dynamic";
export default async function P({ params }: { params: Promise<{ route: string }> }) { await pageGuard((await params).route, "contact");
  const rows = await prisma.contactMessage.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  return (<div className="p-5 md:p-8 mx-auto w-full max-w-5xl"><h1 className="text-3xl font-bold mb-6">Contact Messages</h1>{rows.length === 0 && <p className="text-muted">No messages yet.</p>}
    <div className="space-y-4">{rows.map(m => <article key={m.id} className="rounded-3xl border border-line bg-card/80 backdrop-blur p-6"><div className="flex flex-wrap justify-between text-sm"><b>{m.name}{m.company ? ` · ${m.company}` : ""}</b><span className="text-muted">{m.createdAt.toLocaleString()}</span></div>
      <a href={`mailto:${m.email}`} className="text-sm text-brand">{m.email}</a><p className="mt-3 text-sm whitespace-pre-wrap">{m.message}</p></article>)}</div></div>); }
