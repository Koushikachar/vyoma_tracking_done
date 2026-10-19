import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { encrypt, decrypt } from "@/lib/encryption/aes";
import { getMerchant } from "@/lib/seller/auth";
import { canDo } from "@/lib/seller/roles";
import { audit } from "@/lib/seller/audit";
import { assessRisk } from "@/lib/seller/risk";
import { getPlans } from "@/lib/seller/plans-db";
import { publicHttpsOrigin } from "@/lib/seller/safe-url";
import { rateLimit } from "@/lib/tracking/rate-limit";
const body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("save-delhivery"), token: z.string().trim().min(8).max(200) }),
  z.object({ action: z.literal("connect-woo"), url: z.string().trim().max(200), key: z.string().trim().min(8).max(200), secret: z.string().trim().min(8).max(200) }),
  z.object({ action: z.literal("sync-woo") }), z.object({ action: z.literal("disconnect"), kind: z.enum(["DELHIVERY", "WOOCOMMERCE"]) }),
]);
const fail = (message: string, status = 400) => NextResponse.json({ success: false, error: { message } }, { status });
const ok = (x: object = {}) => NextResponse.json({ success: true, ...x });
async function woo(origin: string, key: string, secret: string, qs: string) { // redirects are refused so a store cannot bounce us to an internal address
  const r = await fetch(`${origin}/wp-json/wc/v3/orders?${qs}`, { redirect: "manual", signal: AbortSignal.timeout(15_000), headers: { authorization: `Basic ${Buffer.from(`${key}:${secret}`).toString("base64")}`, accept: "application/json" } }).catch(() => null);
  if (!r) throw new Error("Could not reach the store."); if (r.status === 401 || r.status === 403) throw new Error("The store rejected the keys. Check they have Read access."); if (!r.ok) throw new Error(`The store answered with an error (${r.status}).`);
  const j = await r.json().catch(() => null); if (!Array.isArray(j)) throw new Error("That address did not return WooCommerce orders."); return j as any[];
}
export async function POST(req: NextRequest) {
  const m = await getMerchant(); if (!m) return fail("Please sign in.", 401); if (!m.verified) return fail("Please verify your email first.", 403);
  if (!canDo(m.role, "connections.write")) return fail("Your role does not allow this.", 403);
  const p = body.safeParse(await req.json().catch(() => null)); if (!p.success) return fail("Please check the details."); const d = p.data;
  if (!(await rateLimit(`conn:${m.id}`, 20, 60 * 60_000))) return fail("Too many requests. Please try again later.", 429);
  try {
    if (d.action === "disconnect") { await prisma.connection.deleteMany({ where: { merchantId: m.id, kind: d.kind } }); await audit(m.id, "connection.remove", "connection", undefined, d.kind); return ok(); }
    if (d.action === "save-delhivery") { await prisma.connection.upsert({ where: { merchantId_kind: { merchantId: m.id, kind: "DELHIVERY" } }, create: { merchantId: m.id, kind: "DELHIVERY", encKey: encrypt(d.token) }, update: { encKey: encrypt(d.token) } }); await audit(m.id, "connection.save", "connection", undefined, "DELHIVERY"); return ok(); }
    if (d.action === "connect-woo") { const origin = await publicHttpsOrigin(d.url); await woo(origin, d.key, d.secret, "per_page=1"); // prove the keys work before saving
      await prisma.connection.upsert({ where: { merchantId_kind: { merchantId: m.id, kind: "WOOCOMMERCE" } }, create: { merchantId: m.id, kind: "WOOCOMMERCE", shopUrl: origin, encKey: encrypt(d.key), encSecret: encrypt(d.secret) }, update: { shopUrl: origin, encKey: encrypt(d.key), encSecret: encrypt(d.secret) } }); await audit(m.id, "connection.save", "connection", undefined, "WOOCOMMERCE"); return ok(); }
    const c = await prisma.connection.findUnique({ where: { merchantId_kind: { merchantId: m.id, kind: "WOOCOMMERCE" } } }); if (!c?.shopUrl || !c.encSecret) return fail("Connect your WooCommerce store first.");
    const rows = (await woo(await publicHttpsOrigin(c.shopUrl), decrypt(c.encKey), decrypt(c.encSecret), "per_page=100&status=processing,on-hold&orderby=date&order=desc")).map(o => { const n = (o.billing?.first_name ?? "") + " " + (o.billing?.last_name ?? "");
      const x = { orderNo: `WC-${o.number ?? o.id}`, customerName: n.trim() || null, phone: o.billing?.phone || null, pincode: o.shipping?.postcode || o.billing?.postcode || null, paymentType: o.payment_method === "cod" ? "COD" : "PREPAID", amount: Number(o.total) || 0 }; return { ...x, risk: assessRisk(x) }; });
    const cap = (await getPlans())[m.plan].orders - (await prisma.order.count({ where: { merchantId: m.id } })); const take = rows.slice(0, Math.max(0, cap));
    const res = await prisma.order.createMany({ skipDuplicates: true, data: take.map(({ risk, ...x }) => ({ ...x, merchantId: m.id, riskLevel: risk.level, riskReasons: risk.reasons })) });
    await prisma.connection.update({ where: { id: c.id }, data: { lastSyncAt: new Date() } }); await audit(m.id, "woo.sync", "order", undefined, `${res.count} added`);
    return ok({ added: res.count, skipped: rows.length - res.count, capped: rows.length > take.length });
  } catch (e) { return fail((e as Error).message || "Something went wrong.", 400); }
}
