import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import { activePlan } from "@/lib/seller/plans";
import type { Role } from "@/lib/seller/roles";
const COOKIE = "vr_seller", TTL = 7 * 86400_000; const sha = (s: string) => createHash("sha256").update(s).digest("hex");
// Separate from the admin session: merchants never get admin access. Random token per login, only its hash is stored.
// memberId is set when a teammate (not the owner) signs in; `id` below is always the WORKSPACE id, so every tenant-scoped query keeps working.
export async function startSellerSession(merchantId: string, memberId?: string) {
  const t = randomBytes(32).toString("base64url");
  await prisma.merchantSession.create({ data: { merchantId, memberId: memberId ?? null, tokenHash: sha(t), expiresAt: new Date(Date.now() + TTL) } });
  (await cookies()).set(COOKIE, t, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: TTL / 1000 });
}
export async function getMerchant() {
  const t = (await cookies()).get(COOKIE)?.value; if (!t) return null;
  const s = await prisma.merchantSession.findUnique({ where: { tokenHash: sha(t) }, include: { merchant: true, member: true } });
  if (!s || s.expiresAt <= new Date() || s.merchant.suspendedAt) return null;
  if (s.memberId && (!s.member || s.member.status !== "ACTIVE")) return null; // removed or disabled teammates lose access immediately
  const m = s.merchant;
  return { id: m.id, name: m.name, ownerEmail: m.email, email: s.member?.email ?? m.email, userName: s.member?.name ?? m.name, memberId: s.memberId, role: (s.member ? s.member.role : "OWNER") as Role, mfaEnabled: !!(s.member ? s.member.mfaEnabledAt : m.mfaEnabledAt),
    brandName: m.brandName, brandColor: m.brandColor, supportContact: m.supportContact, verified: !!m.emailVerifiedAt, plan: activePlan(m), planUntil: m.planUntil,
    weightDivisor: m.weightDivisor, weightSlab: m.weightSlab, weightTolerance: m.weightTolerance };
}
export async function endSellerSession() {
  const j = await cookies(); const t = j.get(COOKIE)?.value; if (t) await prisma.merchantSession.deleteMany({ where: { tokenHash: sha(t) } }); j.delete(COOKIE);
}
