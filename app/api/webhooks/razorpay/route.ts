import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/db/prisma";
import { audit } from "@/lib/seller/audit";
import { PLANS } from "@/lib/seller/plans";
import { getPlans } from "@/lib/seller/plans-db";
// Razorpay -> us. Trusted only after the HMAC signature of the RAW body matches. Idempotent: a repeated delivery changes nothing.
export async function POST(req: NextRequest) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET; if (!secret) return NextResponse.json({ ok: false }, { status: 503 });
  const raw = await req.text(); const a = Buffer.from(req.headers.get("x-razorpay-signature") ?? ""), b = Buffer.from(createHmac("sha256", secret).update(raw).digest("hex"));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return NextResponse.json({ ok: false }, { status: 401 });
  let ev: any; try { ev = JSON.parse(raw); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }
  if (ev.event !== "payment_link.paid") return NextResponse.json({ ok: true });
  const link = ev.payload?.payment_link?.entity; const merchantId = link?.notes?.merchantId as string | undefined; const plan = link?.notes?.plan as keyof typeof PLANS | undefined; const paid = Number(link?.amount_paid ?? link?.amount);
  if (!link?.id || !merchantId || !plan || plan === "FREE" || !(plan in PLANS)) return NextResponse.json({ ok: true });
  const expected = Number(link?.notes?.price) > 0 ? Number(link.notes.price) : (await getPlans())[plan].price * 100; // the price the seller was shown when the link was made
  if (!(paid >= expected)) { console.error("[billing] underpaid link", link.id); return NextResponse.json({ ok: true }); } // never grant a plan for less than its price
  try { await prisma.payment.create({ data: { merchantId, linkId: link.id, plan, amountPaise: paid } }); } catch { return NextResponse.json({ ok: true }); } // duplicate delivery or unknown merchant
  const m = await prisma.merchant.findUnique({ where: { id: merchantId } }); if (!m) return NextResponse.json({ ok: true });
  const base = m.plan === plan && m.planUntil && m.planUntil > new Date() ? m.planUntil : new Date(); // renewing the same plan adds to the remaining time
  await prisma.merchant.update({ where: { id: merchantId }, data: { plan, planUntil: new Date(+base + 30 * 864e5) } });
  await audit(merchantId, "plan.activated", "payment", link.id, plan);
  return NextResponse.json({ ok: true });
}
