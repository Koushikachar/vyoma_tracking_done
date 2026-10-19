import { prisma } from "@/lib/db/prisma";
import { getSettings } from "@/lib/settings";
// Runs from the cron job. Audit logs are intentionally kept longer than lookup logs and are not purged here.
export async function purgeOld() {
  const cut = new Date(Date.now() - (await getSettings()).retentionDays * 86400_000);
  const [l, w, s] = await Promise.all([prisma.trackingLookup.deleteMany({ where: { createdAt: { lt: cut } } }),
    prisma.webhookEvent.deleteMany({ where: { status: "processed", receivedAt: { lt: cut } } }), prisma.adminSession.deleteMany({ where: { expiresAt: { lt: new Date() } } })]);
  return { lookups: l.count, webhooks: w.count, sessions: s.count };
}
