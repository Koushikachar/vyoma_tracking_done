import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requirePerm } from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/password";
import { rateLimit } from "@/lib/tracking/rate-limit";
import { audit } from "@/lib/logging/audit";
import { invalidatePlans } from "@/lib/seller/plans-db";
const body = z.object({ current: z.string().min(1).max(200), plan: z.enum(["FREE", "GROWTH", "SCALE"]), price: z.number().int().min(0).max(1_000_000), orders: z.number().int().min(1).max(10_000_000), seats: z.number().int().min(1).max(1000) });
const no = (s: number, m: string) => NextResponse.json({ success: false, error: { message: m } }, { status: s });
export async function POST(req: NextRequest) {
  const o = req.headers.get("origin"); if (o && o !== req.nextUrl.origin) return no(403, "Forbidden");
  const g = await requirePerm("sellers"); if (g.error) return g.error; const me = g.session!.user;
  if (!(await rateLimit(`plans:${me.id}`, 20, 900_000))) return no(429, "Too many attempts.");
  const p = body.safeParse(await req.json().catch(() => null)); if (!p.success) return no(400, "Please enter whole numbers within the allowed ranges.");
  const a = p.data; if (a.plan === "FREE" && a.price !== 0) return no(400, "The Free plan must cost ₹0.");
  const self = await prisma.adminUser.findUnique({ where: { id: me.id } }); if (!self || !verifyPassword(a.current, self.passwordHash)) { await audit(me.email, "plan.config.denied", req); return no(403, "Your password is incorrect."); }
  await prisma.planConfig.upsert({ where: { plan: a.plan }, create: { plan: a.plan, price: a.price, orders: a.orders, seats: a.seats }, update: { price: a.price, orders: a.orders, seats: a.seats } });
  invalidatePlans(); await audit(me.email, `plan.config.${a.plan}`, req, "plan", `${a.price}/${a.orders}/${a.seats}`); return NextResponse.json({ success: true });
}
