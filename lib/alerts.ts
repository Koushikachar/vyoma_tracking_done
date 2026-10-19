import { prisma } from "@/lib/db/prisma";
import { getSettings } from "@/lib/settings";
import { sendAdminEmail } from "@/lib/email";
const HOUR = 3600_000;
// Carrier health = successes vs real provider failures only. "Not found" or invalid IDs are user errors and are ignored. Runs from the cron job.
export async function checkCarrierHealth() {
  const cfg = await getSettings();
  const rows = await prisma.trackingLookup.findMany({ where: { createdAt: { gte: new Date(Date.now() - HOUR) }, carrierCode: { not: null, notIn: ["vyoma_test"] },
    OR: [{ success: true }, { errorCode: { in: ["PROVIDER_UNAVAILABLE", "INTERNAL_ERROR"] } }] }, select: { carrierCode: true, success: true } });
  const by = new Map<string, { n: number; ok: number }>(); for (const r of rows) { const x = by.get(r.carrierCode!) ?? { n: 0, ok: 0 }; x.n++; if (r.success) x.ok++; by.set(r.carrierCode!, x); }
  for (const [c, { n, ok }] of by) {
    if (n < 10) continue; const rate = Math.round((ok / n) * 100); const key = `alert:${c}`; const prev = (await prisma.systemSetting.findUnique({ where: { key } }))?.value as any;
    const save = (v: object) => prisma.systemSetting.upsert({ where: { key }, update: { value: v }, create: { key, value: v } });
    if (rate < cfg.alertThreshold) { if (!prev?.active || Date.now() - prev.at > 6 * HOUR) { await sendAdminEmail(`VYOMA ROUTE alert: ${c} success rate ${rate}%`, `${c}: ${ok} of ${n} lookups succeeded in the last hour (threshold ${cfg.alertThreshold}%).`); await save({ active: true, rate, at: Date.now() }); } }
    else if (prev?.active) await save({ active: false, rate, at: Date.now() }); // recovered
  }
}
export async function activeAlerts() {
  const rows = await prisma.systemSetting.findMany({ where: { key: { startsWith: "alert:" } } });
  return rows.filter(r => (r.value as any)?.active).map(r => ({ carrier: r.key.slice(6), rate: (r.value as any).rate as number }));
}
