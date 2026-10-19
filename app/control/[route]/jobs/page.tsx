import { pageGuard } from "@/lib/auth/guard";
import { prisma } from "@/lib/db/prisma";
import JobsAdmin from "@/components/admin/JobsAdmin";
export const dynamic = "force-dynamic";
export default async function P({ params }: { params: Promise<{ route: string }> }) {
  await pageGuard((await params).route, "sellers");
  const [counts, jobs, failedMsgs] = await Promise.all([prisma.job.groupBy({ by: ["status"], _count: { _all: true } }), prisma.job.findMany({ orderBy: { createdAt: "desc" }, take: 60 }),
    prisma.shipmentNotification.findMany({ where: { status: "FAILED" }, orderBy: { createdAt: "desc" }, take: 15, include: { merchant: { select: { email: true } }, order: { select: { orderNo: true } } } })]);
  return <div className="p-5 md:p-8 mx-auto w-full max-w-6xl"><h1 className="text-3xl font-bold">Background jobs</h1><p className="mt-1 mb-6 text-sm text-muted">Automatic tracking refreshes and customer messages. Failed jobs can be retried here.</p>
    <JobsAdmin counts={Object.fromEntries(counts.map(c => [c.status, c._count._all]))} autoRefresh={process.env.AUTO_REFRESH_ENABLED === "true"} cronReady={!!process.env.CRON_SECRET}
      jobs={jobs.map(j => ({ id: j.id, type: j.type, status: j.status, attempts: j.attempts, max: j.maxAttempts, runAt: j.runAt.toISOString(), error: j.lastError }))}
      failed={failedMsgs.map(n => ({ id: n.id, email: n.merchant.email, order: n.order.orderNo, event: n.event, detail: n.detail, at: n.createdAt.toISOString() }))} /></div>;
}
