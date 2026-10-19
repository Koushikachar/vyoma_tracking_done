import { pageGuard } from "@/lib/auth/guard"; import { prisma } from "@/lib/db/prisma"; import UsersAdmin from "@/components/admin/UsersAdmin";
export const dynamic = "force-dynamic";
export default async function P({ params }: { params: Promise<{ route: string }> }) { const s = await pageGuard((await params).route, "users");
  const users = await prisma.adminUser.findMany({ orderBy: { createdAt: "asc" }, select: { id: true, email: true, role: true } });
  return <div className="p-5 md:p-8 mx-auto w-full max-w-5xl"><h1 className="text-3xl font-bold">Users</h1><p className="mt-1 mb-6 text-sm text-muted">Who can sign in to this admin panel, and what they can access.</p><UsersAdmin users={users} selfId={s.user.id} /></div>; }
