import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requirePerm } from "@/lib/auth/session";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { newSecret } from "@/lib/auth/totp";
import { encrypt } from "@/lib/encryption/aes";
import { generateCodes, hashCode } from "@/lib/auth/recovery";
import { rateLimit } from "@/lib/tracking/rate-limit";
import { audit } from "@/lib/logging/audit";
const roles = z.enum(["SUPER_ADMIN", "ADMIN", "SUPPORT", "ANALYST"]); const cur = z.string().min(1).max(200);
const body = z.discriminatedUnion("action", [z.object({ action: z.literal("create"), current: cur, email: z.string().email().max(120), role: roles }),
  z.object({ action: z.literal("set-role"), current: cur, id: z.string(), role: roles }), z.object({ action: z.literal("delete"), current: cur, id: z.string() })]);
const no = (s: number, m: string) => NextResponse.json({ success: false, error: { message: m } }, { status: s });
export async function POST(req: NextRequest) {
  const o = req.headers.get("origin"); if (o && o !== req.nextUrl.origin) return no(403, "Forbidden");
  const g = await requirePerm("users"); if (g.error) return g.error; const me = g.session!.user; // SUPER_ADMIN only, checked server-side
  if (!(await rateLimit(`users:${me.id}`, 10, 900_000))) return no(429, "Too many attempts.");
  const p = body.safeParse(await req.json().catch(() => null)); if (!p.success) return no(400, "Invalid request.");
  const self = await prisma.adminUser.findUnique({ where: { id: me.id } });
  if (!self || !verifyPassword(p.data.current, self.passwordHash)) { await audit(me.email, `user.${p.data.action}.denied`, req); return no(403, "Your password is incorrect."); } // re-auth
  const a = p.data;
  if (a.action === "create") {
    const email = a.email.toLowerCase(); if (await prisma.adminUser.findUnique({ where: { email } })) return no(409, "That email already exists.");
    const password = randomBytes(12).toString("base64url"); const secret = newSecret(); const codes = generateCodes();
    const u = await prisma.adminUser.create({ data: { email, role: a.role, passwordHash: hashPassword(password), totpSecretEnc: encrypt(secret), recoveryHashes: codes.map(hashCode) } });
    await audit(me.email, "user.created", req, "admin_user", u.id); // credentials are returned once, to hand over securely; the new admin should change the password on first login
    return NextResponse.json({ success: true, email, password, codes, otpauth: `otpauth://totp/VYOMA%20ROUTE:${encodeURIComponent(email)}?secret=${secret}&issuer=VYOMA%20ROUTE` });
  }
  if (a.id === me.id) return no(400, "You can't change or remove your own account here."); // also guarantees a SUPER_ADMIN always remains
  if (a.action === "set-role") { await prisma.adminUser.update({ where: { id: a.id }, data: { role: a.role } }); await prisma.adminSession.deleteMany({ where: { userId: a.id } }); await audit(me.email, "user.role_changed", req, "admin_user", a.id); return NextResponse.json({ success: true }); }
  await prisma.adminSession.deleteMany({ where: { userId: a.id } }); await prisma.adminUser.delete({ where: { id: a.id } }); await audit(me.email, "user.deleted", req, "admin_user", a.id); return NextResponse.json({ success: true });
}
