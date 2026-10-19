import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requirePerm } from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/password";
import { rateLimit } from "@/lib/tracking/rate-limit";
import { audit } from "@/lib/logging/audit";
const body = z.object({ current: z.string().min(1).max(200), action: z.enum(["retry", "cancel"]), id: z.string().min(5).max(40) });
const no = (s: number, m: string) => NextResponse.json({ success: false, error: { message: m } }, { status: s });
export async function POST(req: NextRequest) {
  const o = req.headers.get("origin"); if (o && o !== req.nextUrl.origin) return no(403, "Forbidden");
  const g = await requirePerm("sellers"); if (g.error) return g.error; const me = g.session!.user;
  if (!(await rateLimit(`jobs:${me.id}`, 60, 900_000))) return no(429, "Too many attempts.");
  const p = body.safeParse(await req.json().catch(() => null)); if (!p.success) return no(400, "Invalid request."); const a = p.data;
  const self = await prisma.adminUser.findUnique({ where: { id: me.id } }); if (!self || !verifyPassword(a.current, self.passwordHash)) { await audit(me.email, `job.${a.action}.denied`, req); return no(403, "Your password is incorrect."); }
  const r = a.action === "retry" ? await prisma.job.updateMany({ where: { id: a.id, status: "FAILED" }, data: { status: "PENDING", attempts: 0, runAt: new Date(), lastError: null, finishedAt: null } })
    : await prisma.job.updateMany({ where: { id: a.id, status: { in: ["PENDING", "FAILED"] } }, data: { status: "CANCELLED", finishedAt: new Date() } });
  if (!r.count) return no(409, "That job can no longer be changed."); await audit(me.email, `job.${a.action}`, req, "job", a.id); return NextResponse.json({ success: true });
}
