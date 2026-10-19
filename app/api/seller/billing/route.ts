import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getMerchant } from "@/lib/seller/auth";
import { canDo } from "@/lib/seller/roles";
import { getPlans } from "@/lib/seller/plans-db";
import { rateLimit } from "@/lib/tracking/rate-limit";
const fail = (message: string, status = 400) => NextResponse.json({ success: false, error: { message } }, { status });
// Creates a Razorpay hosted payment link for one 30-day plan period. The plan is activated only by the verified webhook, never by this request.
export async function POST(req: NextRequest) {
  const m = await getMerchant(); if (!m) return fail("Please sign in.", 401); if (!m.verified) return fail("Please verify your email first.", 403);
  if (!canDo(m.role, "billing")) return fail("Only the workspace owner can manage billing.", 403);
  const p = z.object({ plan: z.enum(["GROWTH", "SCALE"]) }).safeParse(await req.json().catch(() => null)); if (!p.success) return fail("Choose a plan.");
  const id = process.env.RAZORPAY_KEY_ID, secret = process.env.RAZORPAY_KEY_SECRET; if (!id || !secret) return fail("Online payments are not set up yet. Please contact support.", 503);
  if (!(await rateLimit(`billing:${m.id}`, 10, 60 * 60_000))) return fail("Too many attempts. Please try again later.", 429);
  const plan = (await getPlans())[p.data.plan]; const site = process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin;
  const r = await fetch("https://api.razorpay.com/v1/payment_links", { method: "POST", signal: AbortSignal.timeout(15_000), headers: { authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`, "content-type": "application/json" },
    body: JSON.stringify({ amount: plan.price * 100, currency: "INR", accept_partial: false, description: `Vyoma Route ${plan.label} plan (30 days)`, customer: { name: m.name, email: m.email }, notify: { email: true }, reminder_enable: false, notes: { merchantId: m.id, plan: p.data.plan, price: String(plan.price * 100) }, callback_url: `${site}/seller?paid=1`, callback_method: "get" }) }).catch(() => null);
  const j = await r?.json().catch(() => ({})) as { short_url?: string; error?: { description?: string } } | undefined;
  if (!r?.ok || !j?.short_url) { console.error("[billing] Razorpay error", r?.status, j?.error?.description); return fail("Could not start the payment. Please try again.", 502); }
  return NextResponse.json({ success: true, url: j.short_url });
}
