import { pageGuard } from "@/lib/auth/guard"; import { prisma } from "@/lib/db/prisma"; import ApiKeys from "@/components/admin/ApiKeys";
export const dynamic = "force-dynamic";
export default async function P({ params }: { params: Promise<{ route: string }> }) { await pageGuard((await params).route, "apikeys");
  const k = await prisma.apiKey.findMany({ orderBy: { createdAt: "desc" } });
  return <div className="p-5 md:p-8 mx-auto w-full max-w-5xl"><h1 className="text-3xl font-bold mb-6">API Keys</h1><ApiKeys keys={k.map(x => ({ id: x.id, name: x.name, prefix: x.prefix, lastUsedAt: x.lastUsedAt?.toLocaleString() ?? null, revoked: !!x.revokedAt }))} /></div>; }
