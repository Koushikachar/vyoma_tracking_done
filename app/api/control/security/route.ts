import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { newSecret } from "@/lib/auth/totp";
import { encrypt } from "@/lib/encryption/aes";
import { setRecoveryCodes } from "@/lib/auth/recovery";
import { rateLimit } from "@/lib/tracking/rate-limit";
import { audit } from "@/lib/logging/audit";
const cur = z.string().min(1).max(200);
const body = z.discriminatedUnion("action", [z.object({ action: z.literal("change-password"), current: cur, next: z.string().min(12).max(200) }),
  z.object({ action: z.literal("regenerate-recovery"), current: cur }), z.object({ action: z.literal("reset-2fa"), current: cur })]);
const no = (status = 400, message = "Request failed.") => NextResponse.json({ success: false, error: { message } }, { status });
export async function POST(req: NextRequest) {
  const o = req.headers.get("origin"); if (o && o !== req.nextUrl.origin) return no(403, "Forbidden");
  const s = await getSession(); if (!s) return no(401, "Unauthorized");
  if (!(await rateLimit(`sec:${s.user.id}`, 5, 900_000))) return no(429, "Too many attempts.");
  const p = body.safeParse(await req.json().catch(() => null)); if (!p.success) return no(400, "Check the form (new password needs 12+ characters).");
  const u = await prisma.adminUser.findUnique({ where: { id: s.user.id } });
  if (!u || !verifyPassword(p.data.current, u.passwordHash)) { await audit(s.user.email, `${p.data.action}.denied`, req); return no(403, "Current password is incorrect."); } // re-auth for every sensitive action
  const dropOthers = () => prisma.adminSession.deleteMany({ where: { userId: u.id, id: { not: s.sessionId } } });
  if (p.data.action === "change-password") { await prisma.adminUser.update({ where: { id: u.id }, data: { passwordHash: hashPassword(p.data.next) } }); await dropOthers(); await audit(u.email, "password.changed", req); return NextResponse.json({ success: true }); }
  if (p.data.action === "regenerate-recovery") { const codes = await setRecoveryCodes(u.id); await audit(u.email, "recovery.regenerated", req); return NextResponse.json({ success: true, codes }); }
  const secret = newSecret(); await prisma.adminUser.update({ where: { id: u.id }, data: { totpSecretEnc: encrypt(secret) } }); await dropOthers(); const codes = await setRecoveryCodes(u.id); await audit(u.email, "2fa.reset", req);
  return NextResponse.json({ success: true, codes, otpauth: `otpauth://totp/VYOMA%20ROUTE:${encodeURIComponent(u.email)}?secret=${secret}&issuer=VYOMA%20ROUTE` });
}
