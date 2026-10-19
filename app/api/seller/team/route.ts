import { NextRequest, NextResponse } from "next/server";
import { createHash, randomBytes } from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { getMerchant } from "@/lib/seller/auth";
import { audit } from "@/lib/seller/audit";
import { assignable, canDo } from "@/lib/seller/roles";
import { getPlans } from "@/lib/seller/plans-db";
import { actionEmail, sendEmail } from "@/lib/email";
import { rateLimit } from "@/lib/tracking/rate-limit";
const id = z.string().min(5).max(40), role = z.enum(["ADMIN", "OPERATIONS", "FINANCE", "VIEWER"]), t = (n: number, min = 1) => z.string().trim().min(min).max(n);
const body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("invite"), email: z.string().trim().toLowerCase().email(), role }), z.object({ action: z.literal("revoke-invite"), id }),
  z.object({ action: z.literal("set-role"), id, role }), z.object({ action: z.literal("remove"), id }), z.object({ action: z.literal("reset-mfa"), id }),
  z.object({ action: z.literal("pickup-save"), id: id.optional(), name: t(60, 2), contactName: t(60, 0).optional(), phone: t(20, 0).optional(), addressLine: t(200, 5), city: t(60, 2), state: t(60, 2), pincode: z.string().regex(/^[1-9]\d{5}$/), makeDefault: z.boolean().optional() }),
  z.object({ action: z.literal("pickup-delete"), id }),
]);
const fail = (message: string, status = 400) => NextResponse.json({ success: false, error: { message } }, { status });
const ok = () => NextResponse.json({ success: true });
export async function POST(req: NextRequest) {
  const m = await getMerchant(); if (!m) return fail("Please sign in.", 401); if (!m.verified) return fail("Please verify your email first.", 403);
  const p = body.safeParse(await req.json().catch(() => null)); if (!p.success) return fail("Please check the details."); const d = p.data;
  if (!canDo(m.role, d.action.startsWith("pickup") ? "orders.write" : "team.manage")) return fail("Your role does not allow this.", 403);
  if (!(await rateLimit(`team:${m.id}`, 30, 10 * 60_000))) return fail("Too many requests. Please wait a few minutes.", 429);
  if (d.action === "invite") {
    if (!assignable(m.role, d.role)) return fail("You cannot give that role.", 403);
    if ((await prisma.merchant.findUnique({ where: { email: d.email } })) || (await prisma.teamMember.findUnique({ where: { email: d.email } }))) return fail("That email already has an account.", 409);
    await prisma.teamInvite.deleteMany({ where: { merchantId: m.id, email: d.email, usedAt: null } }); // a new invite replaces the old one
    const plans = await getPlans();
    const used = 1 + (await prisma.teamMember.count({ where: { merchantId: m.id } })) + (await prisma.teamInvite.count({ where: { merchantId: m.id, usedAt: null, expiresAt: { gt: new Date() } } }));
    if (used >= plans[m.plan].seats) return fail(`Your ${plans[m.plan].label} plan includes ${plans[m.plan].seats} seat(s). Upgrade to invite more people.`, 402);
    const tk = randomBytes(32).toString("base64url"); const inv = await prisma.teamInvite.create({ data: { merchantId: m.id, email: d.email, role: d.role, tokenHash: createHash("sha256").update(tk).digest("hex"), invitedBy: m.email, expiresAt: new Date(Date.now() + 7 * 864e5) } });
    try { await sendEmail({ to: d.email, subject: `${m.brandName || m.name} invited you to Vyoma Route`, ...actionEmail({ name: "there", heading: "You have been invited", intro: `${m.userName} invited you to join ${m.brandName || m.name} on Vyoma Route as ${d.role.toLowerCase()}.`, button: "Join the workspace", url: `${process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin}/seller/join?token=${tk}`, note: "This link works once and expires in 7 days. If you were not expecting it, ignore this email." }) }); }
    catch (e) { await prisma.teamInvite.delete({ where: { id: inv.id } }); console.error("[team] invite email failed:", (e as Error).message); return fail("We could not send the invitation email. Please try again later.", 502); }
    await audit(m.id, "team.invite", "invite", inv.id, `${d.role} · ${d.email}`); return ok();
  }
  if (d.action === "revoke-invite") { await prisma.teamInvite.deleteMany({ where: { id: d.id, merchantId: m.id, usedAt: null } }); await audit(m.id, "team.invite_revoked", "invite", d.id); return ok(); }
  if (d.action === "reset-mfa") { // lets an owner/admin recover a teammate who lost their phone
    const t = await prisma.teamMember.findFirst({ where: { id: d.id, merchantId: m.id } }); if (!t) return fail("Team member not found.", 404); if (!assignable(m.role, t.role)) return fail("You cannot change this person.", 403);
    await prisma.teamMember.update({ where: { id: t.id }, data: { mfaSecret: null, mfaEnabledAt: null, mfaRecovery: [] } }); await prisma.merchantSession.deleteMany({ where: { memberId: t.id } }); await audit(m.id, "team.mfa_reset", "member", t.id); return ok();
  }
  if (d.action === "set-role" || d.action === "remove") {
    const t = await prisma.teamMember.findFirst({ where: { id: d.id, merchantId: m.id } }); if (!t) return fail("Team member not found.", 404);
    if (!assignable(m.role, t.role) || (d.action === "set-role" && !assignable(m.role, d.role))) return fail("You cannot change this person.", 403);
    if (d.action === "set-role") { await prisma.teamMember.update({ where: { id: t.id }, data: { role: d.role } }); await audit(m.id, "team.role", "member", t.id, `${t.role} → ${d.role}`); }
    else { await prisma.merchantSession.deleteMany({ where: { memberId: t.id } }); await prisma.teamMember.delete({ where: { id: t.id } }); await audit(m.id, "team.remove", "member", t.id, t.email); }
    return ok();
  }
  if (d.action === "pickup-delete") { await prisma.pickupLocation.deleteMany({ where: { id: d.id, merchantId: m.id } }); await audit(m.id, "pickup.delete", "pickup", d.id); return ok(); }
  const count = await prisma.pickupLocation.count({ where: { merchantId: m.id } }); if (!d.id && count >= 20) return fail("You can save up to 20 pickup locations.");
  const data = { name: d.name, contactName: d.contactName || null, phone: d.phone || null, addressLine: d.addressLine, city: d.city, state: d.state, pincode: d.pincode };
  let pid = d.id; if (d.id) { if (!(await prisma.pickupLocation.updateMany({ where: { id: d.id, merchantId: m.id }, data })).count) return fail("Location not found.", 404); }
  else pid = (await prisma.pickupLocation.create({ data: { ...data, merchantId: m.id, isDefault: count === 0 } })).id;
  if (d.makeDefault && pid) { await prisma.pickupLocation.updateMany({ where: { merchantId: m.id }, data: { isDefault: false } }); await prisma.pickupLocation.update({ where: { id: pid }, data: { isDefault: true } }); }
  await audit(m.id, "pickup.save", "pickup", pid); return ok();
}
