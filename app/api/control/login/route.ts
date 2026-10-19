import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { verifyTotp } from "@/lib/auth/totp";
import { decrypt } from "@/lib/encryption/aes";
import { consumeRecovery } from "@/lib/auth/recovery";
import { makePending, readPending, createSession } from "@/lib/auth/session";
import { rateLimit } from "@/lib/tracking/rate-limit";
import { audit } from "@/lib/logging/audit";
const body = z.discriminatedUnion("step", [
  z.object({ step: z.literal("password"), email: z.string().email(), password: z.string().min(1).max(200) }),
  z.object({ step: z.literal("totp"), pending: z.string(), code: z.string().trim().min(6).max(20).transform(s => s.replace(/\s+/g, "")) })]);
const bad = (m = "Invalid email or password.", s = 401) => NextResponse.json({ success: false, error: { message: m } }, { status: s });

export async function POST(req: NextRequest) {
  // CSRF: same-origin only (plus SameSite=strict cookie)
  const origin = req.headers.get("origin"); if (origin && origin !== req.nextUrl.origin) return bad("Forbidden", 403);
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  if (!(await rateLimit(`login:${ip}`, process.env.NODE_ENV === "production" ? 10 : 200, 15 * 60_000))) return bad("Too many attempts. Try later.", 429);
  const p = body.safeParse(await req.json().catch(() => null)); if (!p.success) return bad();

  if (p.data.step === "password") {
    const u = await prisma.adminUser.findUnique({ where: { email: p.data.email.toLowerCase() } });
    if (u?.lockedUntil && u.lockedUntil > new Date()) return bad();
    // Same generic error whether the email exists or not
    if (!u || !verifyPassword(p.data.password, u.passwordHash)) {
      if (u) { const f = u.failedLogins + 1; await prisma.adminUser.update({ where: { id: u.id }, data: { failedLogins: f, lockedUntil: f >= 5 ? new Date(Date.now() + 15 * 60_000 * Math.min(f - 4, 8)) : null } }); }
      await audit(p.data.email, "login.failed", req); return bad();
    }
    if (!u.totpSecretEnc) return bad("2FA is not set up for this account.", 403);
    return NextResponse.json({ success: true, mfa: true, pending: makePending(u.id) });
  }
  const uid = readPending(p.data.pending); if (!uid) return bad("Session expired. Start again.");
  const u = await prisma.adminUser.findUnique({ where: { id: uid } });
  if (!u?.totpSecretEnc || !(/^\d{6}$/.test(p.data.code) ? verifyTotp(decrypt(u.totpSecretEnc), p.data.code) : await consumeRecovery(u.id, p.data.code))) { await audit(uid, "2fa.failed", req); return bad("Invalid code.", 401); }
  await prisma.adminUser.update({ where: { id: u.id }, data: { failedLogins: 0, lockedUntil: null } });
  await createSession(u.id, ip, req.headers.get("user-agent") ?? undefined); await audit(u.email, "login.success", req);
  return NextResponse.json({ success: true });
}
