import { prisma } from "@/lib/db/prisma";
import { PLANS, type Plan } from "@/lib/seller/plans";
export type PlanInfo = { label: string; price: number; orders: number; seats: number };
let cache: { at: number; v: Record<Plan, PlanInfo> } | null = null;
export const invalidatePlans = () => { cache = null; };
// Plans as the admin has configured them (falls back to the defaults). Cached for 30 s per server instance.
export async function getPlans(): Promise<Record<Plan, PlanInfo>> {
  if (cache && Date.now() - cache.at < 30_000) return cache.v;
  const rows = await prisma.planConfig.findMany().catch(() => [] as { plan: string; price: number; orders: number; seats: number }[]);
  const v = Object.fromEntries((Object.keys(PLANS) as Plan[]).map(k => { const o = rows.find(r => r.plan === k); return [k, { label: PLANS[k].label, price: k === "FREE" ? 0 : o?.price ?? PLANS[k].price, orders: o?.orders ?? PLANS[k].orders, seats: o?.seats ?? PLANS[k].seats }]; })) as Record<Plan, PlanInfo>;
  cache = { at: Date.now(), v }; return v;
}
