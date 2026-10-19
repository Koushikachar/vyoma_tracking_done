import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { getMerchant } from "@/lib/seller/auth";
import { audit } from "@/lib/seller/audit";
import { canDo } from "@/lib/seller/roles";
import { rateLimit } from "@/lib/tracking/rate-limit";
const n = (max: number, min = 0) => z.number().finite().min(min).max(max);
const body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("rate-save"), courier: z.string().trim().min(2).max(40), baseRate: n(100000), baseKg: n(1000, 0.01), extraRate: n(100000), extraKg: n(1000, 0.01), codFee: n(100000), codPercent: n(100), etaDays: z.number().int().min(1).max(60), maxKg: n(100000, 0.01).nullable(), codAllowed: z.boolean(), pincodePrefixes: z.array(z.string().regex(/^\d{1,6}$/)).max(200) }),
  z.object({ action: z.literal("rate-delete"), id: z.string().min(5).max(40) }),
]);
const fail = (message: string, status = 400) => NextResponse.json({ success: false, error: { message } }, { status });
export async function POST(req: NextRequest) {
  const m = await getMerchant(); if (!m) return fail("Please sign in.", 401); if (!m.verified) return fail("Please verify your email first.", 403);
  if (!canDo(m.role, "records.write")) return fail("Your role does not allow this.", 403); if (m.plan !== "SCALE") return fail("Courier comparison is part of the Scale plan.", 402);
  if (!(await rateLimit(`rates:${m.id}`, 60, 60_000))) return fail("Too many requests. Please wait a moment.", 429);
  const p = body.safeParse(await req.json().catch(() => null)); if (!p.success) return fail("Please check the numbers."); const d = p.data;
  if (d.action === "rate-delete") { await prisma.rateCard.deleteMany({ where: { id: d.id, merchantId: m.id } }); await audit(m.id, "rates.delete", "rateCard", d.id); return NextResponse.json({ success: true }); }
  if (!(await prisma.rateCard.findUnique({ where: { merchantId_courier: { merchantId: m.id, courier: d.courier } } })) && (await prisma.rateCard.count({ where: { merchantId: m.id } })) >= 30) return fail("You can save up to 30 couriers.");
  const { action, ...data } = d; await prisma.rateCard.upsert({ where: { merchantId_courier: { merchantId: m.id, courier: d.courier } }, create: { merchantId: m.id, ...data }, update: data });
  await audit(m.id, "rates.save", "rateCard", undefined, d.courier); return NextResponse.json({ success: true });
}
