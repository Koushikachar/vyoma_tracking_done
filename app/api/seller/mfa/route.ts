import { NextRequest, NextResponse } from "next/server";
import { createHash, randomBytes } from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { encrypt, decrypt } from "@/lib/encryption/aes";
import { newSecret, verifyTotp } from "@/lib/auth/totp";
import { verifyPassword } from "@/lib/auth/password";
import { getMerchant } from "@/lib/seller/auth";
import { audit } from "@/lib/seller/audit";
import { rateLimit } from "@/lib/tracking/rate-limit";
const body = z.discriminatedUnion("action", [z.object({ action: z.literal("begin") }), z.object({ action: z.literal("enable"), code: z.string().trim().min(6).max(10) }), z.object({ action: z.literal("disable"), password: z.string().min(1).max(200) })]);
const fail = (message: string, status = 400) => NextResponse.json({ success: false, error: { message } }, { status });
// Two-step sign-in (authenticator app). Works for the owner and for every teammate on their own account.
export async function POST(req: NextRequest) {
  const m = await getMerchant(); if (!m) return fail("Please sign in.", 401);
  if (!(await rateLimit(`mfa:${m.memberId ?? m.id}`, 10, 10 * 60_000))) return fail("Too many attempts. Please wait a few minutes.", 429);
  const p = body.safeParse(await req.json().catch(() => null)); if (!p.success) return fail("Invalid request."); const d = p.data;
  const row = m.memberId ? await prisma.teamMember.findUnique({ where: { id: m.memberId } }) : await prisma.merchant.findUnique({ where: { id: m.id } }); if (!row) return fail("Account not found.", 404);
  const save = (data: object) => m.memberId ? prisma.teamMember.update({ where: { id: m.memberId }, data }) : prisma.merchant.update({ where: { id: m.id }, data });
  if (d.action === "begin") { if (row.mfaEnabledAt) return fail("Two-step sign-in is already on.", 409);
    const secret = newSecret(); await save({ mfaSecret: encrypt(secret), mfaEnabledAt: null, mfaRecovery: [] });
    return NextResponse.json({ success: true, secret, uri: `otpauth://totp/${encodeURIComponent("Vyoma Route")}:${encodeURIComponent(m.email)}?secret=${secret}&issuer=${encodeURIComponent("Vyoma Route")}` }); }
  if (d.action === "enable") { if (row.mfaEnabledAt || !row.mfaSecret) return fail("Start the set-up again.", 409);
    if (!verifyTotp(decrypt(row.mfaSecret), d.code.replace(/\s/g, ""))) return fail("That code is not correct. Check your phone's clock and try again.", 400);
    const codes = Array.from({ length: 8 }, () => randomBytes(5).toString("hex")); // shown once; only their hashes are kept
    await save({ mfaEnabledAt: new Date(), mfaRecovery: codes.map(c => createHash("sha256").update(c).digest("hex")) }); await audit(m.id, "mfa.enable", "user", m.memberId ?? m.id); return NextResponse.json({ success: true, codes }); }
  if (!verifyPassword(d.password, row.passwordHash)) return fail("Your password is incorrect.", 403);
  await save({ mfaSecret: null, mfaEnabledAt: null, mfaRecovery: [] }); await audit(m.id, "mfa.disable", "user", m.memberId ?? m.id); return NextResponse.json({ success: true });
}
