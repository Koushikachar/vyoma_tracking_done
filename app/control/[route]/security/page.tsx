import { redirect } from "next/navigation";
import SecurityActions from "@/components/admin/SecurityActions";
import { getSession } from "@/lib/auth/session"; import { prisma } from "@/lib/db/prisma";
export const dynamic = "force-dynamic";
export default async function P({ params }: { params: Promise<{ route: string }> }) { const { route } = await params; const s = await getSession(); if (!s) redirect(`/control/${route}/login`);
  const [u, sessions, attempts] = await Promise.all([prisma.adminUser.findUnique({ where: { id: s.user.id } }),
    prisma.adminSession.findMany({ where: { userId: s.user.id, expiresAt: { gt: new Date() } }, orderBy: { createdAt: "desc" } }),
    prisma.auditLog.findMany({ where: { actor: { in: [s.user.email, s.user.id] }, action: { in: ["login.success", "login.failed", "2fa.failed"] } }, orderBy: { createdAt: "desc" }, take: 10 })]);
  return (<div className="p-5 md:p-8 mx-auto w-full max-w-4xl space-y-8"><h1 className="text-3xl font-bold mb-6">Security</h1>
    <p>Two-factor authentication: <b>{u?.totpSecretEnc ? "Enabled" : "Not set up"}</b></p>
    <section><h2 className="font-semibold mb-2">Active sessions</h2><ul className="text-sm space-y-1">{sessions.map(x => <li key={x.id}>{x.createdAt.toLocaleString()} · {x.ip ?? "?"} · {x.userAgent?.slice(0, 50)}{x.id === s.sessionId ? " (this device)" : ""}</li>)}</ul>
      <form action="/api/control/logout-all" method="post" className="mt-3"><button className="rounded-lg border border-line px-4 py-2 text-sm">Log out all devices</button></form></section>
    <section><h2 className="font-semibold mb-2">Recent login attempts</h2><ul className="text-sm">{attempts.map(a => <li key={a.id}>{a.createdAt.toLocaleString()} — {a.action} ({a.ip})</li>)}</ul></section>
    <p className="text-sm">Recovery codes remaining: <b>{u?.recoveryHashes.length ?? 0}</b></p><SecurityActions /></div>); }
