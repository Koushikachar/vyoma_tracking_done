import { NextRequest, NextResponse } from "next/server";
import { createHash, randomBytes } from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { rateLimit } from "@/lib/tracking/rate-limit";
import { endSellerSession, getMerchant, startSellerSession } from "@/lib/seller/auth";
import { actionEmail, sendEmail } from "@/lib/email";
import { decrypt } from "@/lib/encryption/aes";
import { verifyTotp } from "@/lib/auth/totp";
const pw = z.string().min(10).max(200), email = z.string().trim().toLowerCase().email(), token = z.string().min(20).max(80);
const body = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("register"), name: z.string().trim().min(2).max(80), email, password: pw }),
  z.object({ mode: z.literal("login"), email, password: z.string().max(200), code: z.string().max(40).optional() }),
  z.object({ mode: z.literal("logout") }), z.object({ mode: z.literal("resend") }),
  z.object({ mode: z.literal("verify"), token }), z.object({ mode: z.literal("forgot"), email }), z.object({ mode: z.literal("reset"), token, password: pw }),
  z.object({ mode: z.literal("join"), token, name: z.string().trim().min(2).max(80), password: pw }),
]);
const fail = (message: string, status = 400) => NextResponse.json({ success: false, error: { message } }, { status });
const ok = () => NextResponse.json({ success: true });
const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const emailTaken = async (e: string) => !!((await prisma.merchant.findUnique({ where: { email: e } })) || (await prisma.teamMember.findUnique({ where: { email: e } })));
// One-time tokens: random, only the hash is stored, previous unused ones are cancelled, and each can be used once (atomic updateMany).
async function issue(merchantId: string, kind: "VERIFY" | "RESET", hours: number, memberId?: string) {
  await prisma.merchantToken.deleteMany({ where: { merchantId, kind, usedAt: null, memberId: memberId ?? null } }); const t = randomBytes(32).toString("base64url");
  await prisma.merchantToken.create({ data: { merchantId, memberId: memberId ?? null, kind, tokenHash: sha(t), expiresAt: new Date(Date.now() + hours * 3600_000) } }); return t;
}
async function consume(t: string, kind: "VERIFY" | "RESET") {
  const r = await prisma.merchantToken.findUnique({ where: { tokenHash: sha(t) } }); if (!r || r.kind !== kind || r.usedAt || r.expiresAt < new Date()) return null;
  return (await prisma.merchantToken.updateMany({ where: { id: r.id, usedAt: null }, data: { usedAt: new Date() } })).count ? r : null;
}
type MfaUser = { id: string; mfaEnabledAt: Date | null; mfaSecret: string | null; mfaRecovery: string[] };
// Second step of sign-in. A 6-digit code from the authenticator app, or a one-time recovery code (used up when accepted).
async function mfaGate(u: MfaUser, kind: "m" | "t", code: string | undefined, email: string) {
  if (!u.mfaEnabledAt) return null;
  if (!code) return NextResponse.json({ success: false, mfaRequired: true, error: { message: "Enter your 6-digit code." } }, { status: 401 });
  if (!(await rateLimit(`seller-mfa:${email}`, 8, 10 * 60_000))) return fail("Too many attempts. Please wait a few minutes.", 429);
  const c = code.replace(/\s/g, ""); if (/^\d{6}$/.test(c) && u.mfaSecret && verifyTotp(decrypt(u.mfaSecret), c)) return null;
  const h = sha(c.toLowerCase()); if (!u.mfaRecovery.includes(h)) return fail("That code is not correct.", 401);
  const data = { mfaRecovery: u.mfaRecovery.filter(x => x !== h) }; if (kind === "m") await prisma.merchant.update({ where: { id: u.id }, data }); else await prisma.teamMember.update({ where: { id: u.id }, data }); return null;
}
export async function POST(req: NextRequest) {
  const p = body.safeParse(await req.json().catch(() => null)); if (!p.success) return fail("Please check the details. Passwords need at least 10 characters.");
  const d = p.data; if (d.mode === "logout") { await endSellerSession(); return ok(); }
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local"; const site = process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin;
  if (!(await rateLimit(`seller-auth:${ip}`, 20, 10 * 60_000))) return fail("Too many attempts. Please wait a few minutes.", 429);
  const sendVerify = async (m: { id: string; name: string; email: string }) => { try { const t = await issue(m.id, "VERIFY", 24);
    await sendEmail({ to: m.email, subject: "Confirm your email for Vyoma Route", ...actionEmail({ name: m.name, heading: "Confirm your email", intro: "Please confirm your email address to start using your seller workspace.", button: "Confirm my email", url: `${site}/seller/verify?token=${t}`, note: "This link works once and expires in 24 hours. If you did not create an account, ignore this email." }) }); return true; } catch (e) { console.error("[seller] verification email failed:", (e as Error).message); return false; } };

  if (d.mode === "register") {
    if (await emailTaken(d.email)) return fail("An account with this email already exists.", 409);
    const m = await prisma.merchant.create({ data: { name: d.name, email: d.email, passwordHash: hashPassword(d.password) } });
    await sendVerify(m); await startSellerSession(m.id); return ok();
  }
  if (d.mode === "login") {
    const m = await prisma.merchant.findUnique({ where: { email: d.email } });
    if (m) { if (!verifyPassword(d.password, m.passwordHash)) return fail("Invalid email or password.", 401);
      if (m.suspendedAt) return fail("This account is suspended. Please contact support.", 403);
      const gate = await mfaGate(m, "m", d.code, d.email); if (gate) return gate; await startSellerSession(m.id); return ok(); }
    const t = await prisma.teamMember.findUnique({ where: { email: d.email }, include: { merchant: true } });
    if (!t || !verifyPassword(d.password, t.passwordHash)) return fail("Invalid email or password.", 401);
    if (t.status !== "ACTIVE") return fail("This account has been disabled. Please contact your workspace owner.", 403);
    if (t.merchant.suspendedAt) return fail("This workspace is suspended. Please contact support.", 403);
    const gate = await mfaGate(t, "t", d.code, d.email); if (gate) return gate;
    await startSellerSession(t.merchantId, t.id); return ok();
  }
  if (d.mode === "join") { // accept a team invitation: the email link proves the invitee owns that inbox
    const inv = await prisma.teamInvite.findUnique({ where: { tokenHash: sha(d.token) } });
    if (!inv || inv.usedAt || inv.expiresAt < new Date()) return fail("This invitation is invalid or has expired. Ask your team owner to send a new one.");
    if (await emailTaken(inv.email)) return fail("An account with this email already exists.", 409);
    if (!(await prisma.teamInvite.updateMany({ where: { id: inv.id, usedAt: null }, data: { usedAt: new Date() } })).count) return fail("This invitation was already used.");
    const mem = await prisma.teamMember.create({ data: { merchantId: inv.merchantId, email: inv.email, name: d.name, passwordHash: hashPassword(d.password), role: inv.role } });
    await startSellerSession(inv.merchantId, mem.id); return ok();
  }
  if (d.mode === "resend") { const me = await getMerchant(); if (!me) return fail("Please sign in.", 401); if (me.verified) return ok();
    if (me.memberId) return fail("Only the workspace owner can do this.", 403);
    if (!(await rateLimit(`seller-resend:${me.id}`, 3, 60 * 60_000))) return fail("Too many emails sent. Please try again in an hour.", 429);
    return (await sendVerify({ id: me.id, name: me.name, email: me.ownerEmail })) ? ok() : fail("We could not send the email right now. Please try again later.", 502); }
  if (d.mode === "verify") { const r = await consume(d.token, "VERIFY"); if (!r) return fail("This link is invalid or has expired. Request a new one from your seller page.", 400);
    await prisma.merchant.update({ where: { id: r.merchantId }, data: { emailVerifiedAt: new Date() } }); return ok(); }
  if (d.mode === "forgot") { // always the same answer, so nobody can discover which emails have accounts
    if (await rateLimit(`seller-forgot:${d.email}`, 3, 60 * 60_000)) {
      const o = await prisma.merchant.findUnique({ where: { email: d.email } }); const t = o ? null : await prisma.teamMember.findUnique({ where: { email: d.email } });
      const who = o ? { wid: o.id, mid: undefined as string | undefined, name: o.name, email: o.email } : t ? { wid: t.merchantId, mid: t.id, name: t.name, email: t.email } : null;
      if (who) { try { const tk = await issue(who.wid, "RESET", 1, who.mid); await sendEmail({ to: who.email, subject: "Reset your Vyoma Route password", ...actionEmail({ name: who.name, heading: "Reset your password", intro: "We received a request to reset your password.", button: "Choose a new password", url: `${site}/seller/reset?token=${tk}`, note: "This link works once and expires in 1 hour. If you did not ask for this, ignore this email; your password stays the same." }) }); } catch (e) { console.error("[seller] reset email failed:", (e as Error).message); } } }
    return ok(); }
  const r = await consume(d.token, "RESET"); if (!r) return fail("This link is invalid or has expired. Please request a new reset email.", 400);
  if (r.memberId) { await prisma.teamMember.update({ where: { id: r.memberId }, data: { passwordHash: hashPassword(d.password) } }); await prisma.merchantSession.deleteMany({ where: { memberId: r.memberId } }); }
  else { await prisma.merchant.update({ where: { id: r.merchantId }, data: { passwordHash: hashPassword(d.password), emailVerifiedAt: new Date() } }); await prisma.merchantSession.deleteMany({ where: { merchantId: r.merchantId, memberId: null } }); } // owner reset signs out the owner only, not the team
  return ok();
}
