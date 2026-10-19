import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requirePerm } from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/password";
import { rateLimit } from "@/lib/tracking/rate-limit";
import { audit } from "@/lib/logging/audit";
const cur = z.string().min(1).max(200), id = z.string().min(5).max(40);
const body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("set-plan"), current: cur, id, plan: z.enum(["FREE", "GROWTH", "SCALE"]), days: z.number().int().min(1).max(366).optional() }),
  z.object({ action: z.literal("suspend"), current: cur, id, on: z.boolean() }), z.object({ action: z.literal("verify"), current: cur, id }), z.object({ action: z.literal("reset-mfa"), current: cur, id }), z.object({ action: z.literal("delete"), current: cur, id }),
]);
const no = (s: number, m: string) => NextResponse.json({ success: false, error: { message: m } }, { status: s });
export async function POST(req: NextRequest) {
  const o = req.headers.get("origin"); if (o && o !== req.nextUrl.origin) return no(403, "Forbidden");
  const g = await requirePerm("sellers"); if (g.error) return g.error; const me = g.session!.user;
  if (!(await rateLimit(`sellers:${me.id}`, 30, 900_000))) return no(429, "Too many attempts.");
  const p = body.safeParse(await req.json().catch(() => null)); if (!p.success) return no(400, "Invalid request.");
  const self = await prisma.adminUser.findUnique({ where: { id: me.id } });
  if (!self || !verifyPassword(p.data.current, self.passwordHash)) { await audit(me.email, `seller.${p.data.action}.denied`, req); return no(403, "Your password is incorrect."); } // re-auth for every change
  const a = p.data; const m = await prisma.merchant.findUnique({ where: { id: a.id } }); if (!m) return no(404, "Seller not found.");
  if (a.action === "set-plan") { await prisma.merchant.update({ where: { id: m.id }, data: { plan: a.plan, planUntil: a.plan === "FREE" ? null : new Date(Date.now() + (a.days ?? 30) * 864e5) } }); await audit(me.email, `seller.plan.${a.plan}`, req, "merchant", m.id); }
  else if (a.action === "suspend") { await prisma.merchant.update({ where: { id: m.id }, data: { suspendedAt: a.on ? new Date() : null } }); if (a.on) await prisma.merchantSession.deleteMany({ where: { merchantId: m.id } }); await audit(me.email, a.on ? "seller.suspended" : "seller.unsuspended", req, "merchant", m.id); }
  else if (a.action === "verify") { await prisma.merchant.update({ where: { id: m.id }, data: { emailVerifiedAt: new Date() } }); await audit(me.email, "seller.verified", req, "merchant", m.id); }
  else if (a.action === "reset-mfa") { await prisma.merchant.update({ where: { id: m.id }, data: { mfaSecret: null, mfaEnabledAt: null, mfaRecovery: [] } }); await prisma.merchantSession.deleteMany({ where: { merchantId: m.id, memberId: null } }); await audit(me.email, "seller.mfa_reset", req, "merchant", m.id); }
  else { await prisma.merchant.delete({ where: { id: m.id } }); await audit(me.email, "seller.deleted", req, "merchant", m.id); } // cascades: orders, cases, logo, connections, sessions
  return NextResponse.json({ success: true });
}
