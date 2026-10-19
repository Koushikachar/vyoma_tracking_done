import { prisma } from "@/lib/db/prisma";
import { bucketKey } from "@/lib/tz";
const DAY = 86400_000;
export const RANGE_DAYS = { today: 1, "7d": 7, "30d": 30, "90d": 90, all: null } as const;
export type RangeKey = keyof typeof RANGE_DAYS;
export const isRange = (k: string): k is RangeKey => k in RANGE_DAYS;
export type TrendPoint = { label: string; lookups: number; failures: number };
export type Trends = { points: TrendPoint[]; lookups: number; failures: number };
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const label = (k: string, hourly: boolean) => (hourly ? `${k.slice(11, 13)}:00` : `${+k.slice(8, 10)} ${MON[+k.slice(5, 7) - 1]}`);

/** Lookups/failures per hour (Today) or per day, with empty buckets filled with 0 so the chart line is continuous. */
export async function getTrends(range: RangeKey, tz: string): Promise<Trends> {
  const hourly = range === "today"; const now = Date.now(); let start: number;
  if (range === "all") { const first = (await prisma.trackingLookup.aggregate({ _min: { createdAt: true } }))._min.createdAt;
    start = Math.max(now - 365 * DAY, Math.min(first ? +first : now, now - 6 * DAY)); }
  else start = now - RANGE_DAYS[range]! * DAY;
  const rows = await prisma.trackingLookup.findMany({ where: { createdAt: { gte: new Date(start) } }, select: { createdAt: true, success: true }, take: 100000 });
  const m = new Map<string, TrendPoint>(); const add = (t: number) => { const k = bucketKey(new Date(t), tz, hourly); if (!m.has(k)) m.set(k, { label: label(k, hourly), lookups: 0, failures: 0 }); return k; };
  for (let t = start; t <= now; t += hourly ? 3600_000 : DAY) add(t); add(now);
  for (const r of rows) { const k = add(+r.createdAt); const p = m.get(k)!; p.lookups++; if (!r.success) p.failures++; }
  const points = [...m.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([, v]) => v);
  return { points, lookups: points.reduce((a, p) => a + p.lookups, 0), failures: points.reduce((a, p) => a + p.failures, 0) };
}
