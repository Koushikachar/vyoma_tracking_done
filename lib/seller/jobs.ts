import { prisma } from "@/lib/db/prisma";
import { backoffMinutes } from "@/lib/seller/backoff";
import { refreshOrder } from "@/lib/seller/refresh";
import { EVENT_TEXT, type NotifyEvent } from "@/lib/seller/events";
import { sendTemplate, toE164 } from "@/lib/whatsapp";
async function run(job: { type: string; payload: any }) {
  if (job.type === "tracking.refresh") { const o = await prisma.order.findUnique({ where: { id: job.payload.orderId } }); if (o?.awb) await refreshOrder(o); return; }
  if (job.type === "notify.whatsapp") {
    const n = await prisma.shipmentNotification.findUnique({ where: { id: job.payload.notificationId }, include: { order: { include: { merchant: true } } } }); if (!n || n.status === "SENT") return;
    const o = n.order, tpl = process.env.WHATSAPP_TEMPLATE_STATUS, to = toE164(o.phone);
    if (!o.notifyOptIn || !tpl || !to) { await prisma.shipmentNotification.update({ where: { id: n.id }, data: { status: "FAILED", detail: "Customer has not opted in, or the number is invalid" } }); return; } // consent is re-checked at send time
    const id = await sendTemplate(to, tpl, [o.customerName?.split(" ")[0] || "there", o.orderNo, o.merchant.brandName || o.merchant.name, EVENT_TEXT[n.event as NotifyEvent]]);
    await prisma.shipmentNotification.update({ where: { id: n.id }, data: { status: "SENT", providerId: id, detail: "Accepted by WhatsApp. Waiting for a delivery receipt" } }); return;
  }
  throw new Error(`Unknown job type ${job.type}`);
}
// Claims due jobs one at a time (safe with several workers), retries with backoff, and marks a job FAILED after maxAttempts.
export async function processJobs(limit = 15, budgetMs = 20_000) {
  const t0 = Date.now(); await prisma.job.updateMany({ where: { status: "RUNNING", lockedAt: { lt: new Date(Date.now() - 10 * 60_000) } }, data: { status: "PENDING" } }); // a worker that died mid-job
  const due = await prisma.job.findMany({ where: { status: "PENDING", runAt: { lte: new Date() } }, orderBy: { runAt: "asc" }, take: limit }); let done = 0, failed = 0;
  for (const j of due) { if (Date.now() - t0 > budgetMs) break;
    if (!(await prisma.job.updateMany({ where: { id: j.id, status: "PENDING" }, data: { status: "RUNNING", lockedAt: new Date() } })).count) continue;
    try { await run(j); await prisma.job.update({ where: { id: j.id }, data: { status: "DONE", finishedAt: new Date(), lockedAt: null, lastError: null } }); done++; }
    catch (e) { const attempts = j.attempts + 1, last = attempts >= j.maxAttempts, msg = (e as Error).message.slice(0, 300);
      await prisma.job.update({ where: { id: j.id }, data: { attempts, lastError: msg, lockedAt: null, ...(last ? { status: "FAILED", finishedAt: new Date() } : { status: "PENDING", runAt: new Date(Date.now() + backoffMinutes(attempts) * 60_000) }) } });
      if (last && j.type === "notify.whatsapp") await prisma.shipmentNotification.updateMany({ where: { id: (j.payload as any)?.notificationId }, data: { status: "FAILED", detail: msg } }); failed++; } }
  return { done, failed };
}
// Off unless AUTO_REFRESH_ENABLED=true, because every refresh uses your tracking-service quota. Paid, active, non-suspended workspaces only; at most 40 orders per run.
export async function scheduleRefreshes() {
  if (process.env.AUTO_REFRESH_ENABLED !== "true") return 0;
  const cutoff = new Date(Date.now() - Math.max(1, Number(process.env.AUTO_REFRESH_HOURS) || 6) * 3600_000);
  const orders = await prisma.order.findMany({ where: { awb: { not: null }, status: { in: ["NEW", "IN_TRANSIT", "NDR"] }, OR: [{ lastRefreshedAt: null }, { lastRefreshedAt: { lt: cutoff } }], merchant: { plan: { not: "FREE" }, planUntil: { gt: new Date() }, suspendedAt: null } }, select: { id: true, merchantId: true }, take: 40 });
  if (!orders.length) return 0;
  await prisma.order.updateMany({ where: { id: { in: orders.map(o => o.id) } }, data: { lastRefreshedAt: new Date() } }); // claim them so they are not queued twice
  await prisma.job.createMany({ data: orders.map(o => ({ type: "tracking.refresh", merchantId: o.merchantId, payload: { orderId: o.id } })) }); return orders.length;
}
