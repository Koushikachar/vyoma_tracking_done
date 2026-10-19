import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { getMerchant } from "@/lib/seller/auth";
import { canDo } from "@/lib/seller/roles";
import { audit } from "@/lib/seller/audit";
import { rateLimit } from "@/lib/tracking/rate-limit";
const n = z.number().finite(), note = z.string().trim().max(300).optional(), s = (max: number) => z.string().trim().min(1).max(max);
const body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("cod-save"), lines: z.array(z.object({ awb: s(60), orderNo: z.string().trim().max(60).optional(), expected: n.min(0).max(1e9), received: n.min(0).max(1e9), ref: z.string().trim().max(80).optional(), kind: z.enum(["SHORT", "EXCESS", "UNKNOWN"]) })).min(1).max(2000) }),
  z.object({ action: z.literal("cod-status"), id: s(40), status: z.enum(["OPEN", "DISPUTED", "ADJUSTED", "RESOLVED"]), note }),
  z.object({ action: z.literal("weight-save"), settings: z.object({ divisor: n.min(1).max(100000), slab: n.min(0.01).max(100), tolerance: n.min(0).max(100) }),
    cases: z.array(z.object({ awb: s(60), declaredKg: n.min(0).max(1e5), volumetricKg: n.min(0).max(1e5), expectedKg: n.min(0).max(1e5), billedKg: n.min(0).max(1e5), reason: z.string().max(400) })).max(2000) }),
  z.object({ action: z.literal("weight-status"), id: s(40), status: z.enum(["OPEN", "DISPUTED", "WON", "LOST", "CLOSED"]), note }),
]);
const fail = (message: string, status = 400) => NextResponse.json({ success: false, error: { message } }, { status });
// Saving is a Scale-plan feature and is enforced here on the server (the tabs only hide the buttons).
export async function POST(req: NextRequest) {
  const m = await getMerchant(); if (!m) return fail("Please sign in.", 401); if (!m.verified) return fail("Please verify your email first.", 403);
  if (!canDo(m.role, "records.write")) return fail("Your role does not allow this.", 403);
  if (m.plan !== "SCALE") return fail("Saving COD and weight records is part of the Scale plan.", 402);
  if (!(await rateLimit(`records:${m.id}`, 60, 60_000))) return fail("Too many requests. Please wait a moment.", 429);
  const p = body.safeParse(await req.json().catch(() => null)); if (!p.success) return fail("Invalid data."); const d = p.data;
  if (d.action === "cod-save") {
    const r = await prisma.codLine.createMany({ skipDuplicates: true, data: d.lines.map(l => ({ merchantId: m.id, awb: l.awb, orderNo: l.orderNo, expected: l.expected, received: l.received, diff: Math.round((l.received - l.expected) * 100) / 100, ref: l.ref ?? "", kind: l.kind })) });
    await audit(m.id, "cod.save", "codLine", undefined, `${r.count} saved, ${d.lines.length - r.count} already saved`); return NextResponse.json({ success: true, added: r.count, skipped: d.lines.length - r.count });
  }
  if (d.action === "cod-status") { const r = await prisma.codLine.updateMany({ where: { id: d.id, merchantId: m.id }, data: { status: d.status, note: d.note || null } }); if (!r.count) return fail("Record not found.", 404); await audit(m.id, "cod.status", "codLine", d.id, d.status); return NextResponse.json({ success: true }); }
  if (d.action === "weight-save") {
    await prisma.merchant.update({ where: { id: m.id }, data: { weightDivisor: d.settings.divisor, weightSlab: d.settings.slab, weightTolerance: d.settings.tolerance } });
    const rows = d.cases.map(c => ({ ...c, excessKg: Math.round((c.billedKg - c.expectedKg) * 1000) / 1000 })).filter(c => c.excessKg > 0); // only real overcharges are kept
    const r = await prisma.weightCase.createMany({ skipDuplicates: true, data: rows.map(c => ({ merchantId: m.id, awb: c.awb, declaredKg: c.declaredKg, volumetricKg: c.volumetricKg, expectedKg: c.expectedKg, billedKg: c.billedKg, excessKg: c.excessKg, reason: c.reason })) });
    await audit(m.id, "weight.save", "weightCase", undefined, `${r.count} saved`); return NextResponse.json({ success: true, added: r.count, skipped: rows.length - r.count });
  }
  const r = await prisma.weightCase.updateMany({ where: { id: d.id, merchantId: m.id }, data: { status: d.status, note: d.note || null } }); if (!r.count) return fail("Record not found.", 404);
  await audit(m.id, "weight.status", "weightCase", d.id, d.status); return NextResponse.json({ success: true });
}
