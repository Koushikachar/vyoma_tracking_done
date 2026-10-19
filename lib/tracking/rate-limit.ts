import { prisma } from "@/lib/db/prisma";
// Shared, DB-backed fixed-window limiter: one atomic upsert per check, so limits hold across serverless instances.
// Falls back to a per-instance memory limiter when there is no DB or the DB errors (never fails open).
const mem = new Map<string, { n: number; reset: number }>();
function memLimit(key: string, max: number, windowMs: number) {
  const now = Date.now(); const e = mem.get(key);
  if (!e || e.reset <= now) { mem.set(key, { n: 1, reset: now + windowMs }); return true; }
  e.n++; return e.n <= max;
}
export async function rateLimit(key: string, max = 20, windowMs = 60_000): Promise<boolean> {
  if (!process.env.DATABASE_URL) return memLimit(key, max, windowMs);
  try {
    const rows = await prisma.$queryRaw<{ count: number }[]>`
      INSERT INTO "RateLimit" ("key","count","resetAt") VALUES (${key}, 1, now() + (${windowMs}::int * interval '1 millisecond'))
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE WHEN "RateLimit"."resetAt" <= now() THEN 1 ELSE "RateLimit"."count" + 1 END,
        "resetAt" = CASE WHEN "RateLimit"."resetAt" <= now() THEN now() + (${windowMs}::int * interval '1 millisecond') ELSE "RateLimit"."resetAt" END
      RETURNING "count"`;
    return Number(rows[0].count) <= max;
  } catch { return memLimit(key, max, windowMs); }
}
export async function purgeRateLimits() { try { await prisma.$executeRaw`DELETE FROM "RateLimit" WHERE "resetAt" < now() - interval '1 hour'`; } catch {} }
