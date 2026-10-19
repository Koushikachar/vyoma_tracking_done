import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/db/prisma";
import { getMerchant } from "@/lib/seller/auth";
import { sendTemplate, toE164, waEnabled } from "@/lib/whatsapp";
import { decrypt } from "@/lib/encryption/aes";
import { audit } from "@/lib/seller/audit";
import { canDo } from "@/lib/seller/roles";
import { getPlans } from "@/lib/seller/plans-db";
import { refreshOrder } from "@/lib/seller/refresh";
import { assessRisk, bucket } from "@/lib/seller/risk";
import { rateLimit } from "@/lib/tracking/rate-limit";
import { track, trackingIdSchema } from "@/lib/tracking/service";
const opt = z.string().trim().max(120).optional().or(z.literal("").transform(() => undefined));
const row = z.object({ orderNo: z.string().trim().min(1).max(40), customerName: opt, phone: opt, pincode: opt,
  paymentType: z.string().trim().toUpperCase().pipe(z.enum(["COD", "PREPAID"])).catch("PREPAID"), amount: z.coerce.number().min(0).max(10_000_000).catch(0),
  awb: trackingIdSchema.optional().or(z.literal("").transform(() => undefined)).catch(undefined), carrierCode: opt, notifyOptIn: z.union([z.boolean(), z.string()]).optional().transform(v => v === true || /^(1|true|yes|y)$/i.test(String(v ?? ""))) });
const body = z.discriminatedUnion("action", [z.object({ action: z.literal("import"), rows: z.array(z.unknown()).min(1).max(500) }), z.object({ action: z.literal("refresh"), id: z.string() }), z.object({ action: z.literal("link"), id: z.string() }), z.object({ action: z.literal("cod-verify"), id: z.string() }), z.object({ action: z.literal("wa-ndr"), id: z.string() }), z.object({ action: z.literal("courier-reattempt"), id: z.string() }), z.object({ action: z.literal("resolve"), id: z.string() }),
  z.object({ action: z.literal("brand"), brandName: z.string().trim().max(60), brandColor: z.string().regex(/^#[0-9a-fA-F]{6}$/), supportContact: z.string().trim().max(120) })]);
const out = (data: object, status = 200) => NextResponse.json({ success: true, ...data }, { status });
const fail = (message: string, status = 400) => NextResponse.json({ success: false, error: { message } }, { status });
export async function POST(req: NextRequest) {
  const m = await getMerchant(); if (!m) return fail("Please sign in.", 401); if (!m.verified) return fail("Please verify your email first.", 403); // every query below is scoped to m.id (tenant isolation)
  const p = body.safeParse(await req.json().catch(() => null)); if (!p.success) return fail("Invalid request.");
  const d = p.data;
  const PERM = { import: "orders.write", refresh: "orders.write", link: "orders.write", "cod-verify": "ndr.write", "wa-ndr": "ndr.write", "courier-reattempt": "ndr.write", resolve: "ndr.write", brand: "brand.write" } as const;
  if (!canDo(m.role, PERM[d.action])) return fail("Your role does not allow this.", 403); // roles are checked on the server for every action
  if (d.action === "import") {
    const good = d.rows.map(r => row.safeParse(r)).flatMap(r => (r.success ? [r.data] : []));
    if (!good.length) return fail("No valid rows. Each row needs an order number.");
    const plans = await getPlans(); const cap = plans[m.plan].orders, have = await prisma.order.count({ where: { merchantId: m.id } });
    if (have + good.length > cap) return fail(`Your ${plans[m.plan].label} plan allows ${cap.toLocaleString("en-IN")} orders (you have ${have}). Upgrade to add more.`, 402);
    const res = await prisma.order.createMany({ skipDuplicates: true, data: good.map(r => { const k = assessRisk(r);
      return { merchantId: m.id, orderNo: r.orderNo, customerName: r.customerName, phone: r.phone, pincode: r.pincode, paymentType: r.paymentType, amount: r.amount, awb: r.awb, carrierCode: r.carrierCode, notifyOptIn: r.notifyOptIn, riskLevel: k.level, riskReasons: k.reasons }; }) });
    await audit(m.id, "orders.import", "order", undefined, `${res.count} added`); return out({ added: res.count, skipped: d.rows.length - res.count });
  }
  if (d.action === "brand") { if (m.plan === "FREE") return fail("Branded tracking is part of the Growth plan.", 402); await prisma.merchant.update({ where: { id: m.id }, data: { brandName: d.brandName || null, brandColor: d.brandColor, supportContact: d.supportContact || null } }); await audit(m.id, "brand.update"); return out({}); }
  if (d.action === "resolve") { const n = await prisma.ndrCase.updateMany({ where: { id: d.id, merchantId: m.id }, data: { status: "RESOLVED", resolvedAt: new Date() } }); if (n.count) await audit(m.id, "ndr.resolve", "ndrCase", d.id); return n.count ? out({}) : fail("Case not found.", 404); }
  if (d.action === "wa-ndr" || d.action === "courier-reattempt") {
    if (m.plan === "FREE") return fail("NDR actions are part of the Growth plan.", 402);
    const c = await prisma.ndrCase.findFirst({ where: { id: d.id, merchantId: m.id }, include: { order: true } }); if (!c) return fail("Case not found.", 404);
    if (d.action === "wa-ndr") {
      const tpl = process.env.WHATSAPP_TEMPLATE_NDR, to = toE164(c.order.phone); if (!waEnabled() || !tpl) return fail("WhatsApp is not set up yet.", 503); if (!to) return fail("This customer's phone is not a valid Indian mobile number.");
      if (!(await rateLimit(`wa:${m.id}`, 30, 3600_000))) return fail("Message limit reached. Please try again later.", 429);
      const token = c.order.trackToken ?? randomBytes(12).toString("base64url"); if (!c.order.trackToken) await prisma.order.update({ where: { id: c.orderId }, data: { trackToken: token } });
      try { await sendTemplate(to, tpl, [c.order.customerName?.split(" ")[0] || "there", c.order.orderNo, m.brandName || m.name, `${process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin}/t/${token}`]); await audit(m.id, "whatsapp.ndr", "ndrCase", d.id); return out({}); }
      catch (e) { console.error("[whatsapp]", (e as Error).message); return fail("WhatsApp could not send the message. Check your template and the number.", 502); }
    }
    // Delhivery NDR action API (asynchronous). Uses the SELLER's own Delhivery token, never the platform's.
    if (!/delhivery/i.test(`${c.order.carrierCode} ${c.order.carrierName}`)) return fail("Automatic re-attempt works for Delhivery shipments only. Please arrange it in your courier's portal.");
    const conn = await prisma.connection.findUnique({ where: { merchantId_kind: { merchantId: m.id, kind: "DELHIVERY" } } }); if (!conn) return fail("Connect your Delhivery account in the Connections tab first.");
    if (!c.order.awb) return fail("This order has no tracking number.");
    if (c.customerChoice !== "REATTEMPT" && c.customerChoice !== "UPDATE_ADDRESS") return fail("Wait until the customer asks for a re-attempt or sends a corrected address.");
    const add = (c.customerNote ?? "").replace(/\s+/g, " ").trim(); if (c.customerChoice === "UPDATE_ADDRESS" && add.length > 60) return fail("The corrected address is longer than Delhivery's 60-character limit. Please edit it in Delhivery One.");
    const item = c.customerChoice === "REATTEMPT" ? { waybill: c.order.awb, act: "RE-ATTEMPT" } : { waybill: c.order.awb, act: "EDIT_DETAILS", action_data: { add } };
    const rr = await fetch("https://track.delhivery.com/api/p/update", { method: "POST", signal: AbortSignal.timeout(15_000), headers: { authorization: `Token ${decrypt(conn.encKey)}`, "content-type": "application/json" }, body: JSON.stringify({ data: [item] }) }).catch(() => null);
    const j = (await rr?.json().catch(() => ({}))) as { request_id?: string } | undefined;
    if (!rr?.ok) { console.error("[delhivery] NDR action failed", rr?.status); return fail("Delhivery did not accept the request. The parcel may not be in an NDR state yet, or your token may be wrong.", 502); }
    await prisma.ndrCase.update({ where: { id: c.id }, data: { courierAction: `${item.act}${j?.request_id ? ` · ${j.request_id}` : ""}`, courierActionAt: new Date() } }); await audit(m.id, "ndr.courier_action", "ndrCase", c.id, c.customerChoice ?? undefined); return out({});
  }
  const o = await prisma.order.findFirst({ where: { id: d.id, merchantId: m.id } }); if (!o) return fail("Order not found.", 404);
  if (d.action === "link") { if (m.plan === "FREE") return fail("Customer tracking links are part of the Growth plan.", 402); const token = o.trackToken ?? randomBytes(12).toString("base64url"); if (!o.trackToken) await prisma.order.update({ where: { id: o.id }, data: { trackToken: token } });
    return out({ url: `${process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin}/t/${token}` }); }
  if (d.action === "cod-verify") {
    if (m.plan === "FREE") return fail("COD verification is part of the Growth plan.", 402);
    const tpl = process.env.WHATSAPP_TEMPLATE_COD, to = toE164(o.phone); if (!waEnabled() || !tpl) return fail("WhatsApp is not set up yet.", 503);
    if (o.paymentType !== "COD") return fail("Only COD orders need verification."); if (!to) return fail("Add a valid 10-digit Indian mobile number to this order first."); if (o.codStatus !== "NOT_SENT") return fail("A confirmation was already sent for this order.");
    if (!(await rateLimit(`wa:${m.id}`, 30, 3600_000))) return fail("Message limit reached. Please try again later.", 429);
    try { await sendTemplate(to, tpl, [o.customerName?.split(" ")[0] || "there", o.orderNo, m.brandName || m.name, String(Number(o.amount))], [`cod:confirm:${o.id}`, `cod:cancel:${o.id}`]); await prisma.order.update({ where: { id: o.id }, data: { codStatus: "SENT" } }); await audit(m.id, "whatsapp.cod_verify", "order", o.id); return out({}); }
    catch (e) { console.error("[whatsapp]", (e as Error).message); return fail("WhatsApp could not send the message. Check your template and the number.", 502); }
  }
  if (!o.awb) return fail("Add a tracking number (AWB) to this order first.");
  if (!(await rateLimit(`seller-refresh:${m.id}`, 30, 60_000))) return fail("Too many refreshes. Please wait a minute.", 429);
  try { const status = await refreshOrder(o); return out({ status }); }
  catch { return fail("The carrier could not be reached for this number. Try again shortly.", 502); }
}
