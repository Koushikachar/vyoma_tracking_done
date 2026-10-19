import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { authenticate, err, ok, view } from "@/lib/seller/v1";
import { getPlans } from "@/lib/seller/plans-db";
import { assessRisk } from "@/lib/seller/risk";
import { trackingIdSchema } from "@/lib/tracking/service";
export const dynamic = "force-dynamic";
const site = (req: NextRequest) => process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin;
const STATUS = ["NEW", "IN_TRANSIT", "NDR", "DELIVERED", "RTO"];
// GET /api/v1/orders?limit=25&cursor=<id>&status=NDR  ->  { data: [...], next_cursor }
export async function GET(req: NextRequest) {
  const a = await authenticate(req); if ("res" in a) return a.res; const { merchantId, rid } = a.ctx; const q = req.nextUrl.searchParams;
  const limit = Math.min(100, Math.max(1, Number(q.get("limit")) || 25)), cursor = q.get("cursor"), status = q.get("status");
  if (status && !STATUS.includes(status)) return err(rid, 400, "invalid_request", `status must be one of ${STATUS.join(", ")}`);
  const rows = await prisma.order.findMany({ where: { merchantId, ...(status ? { status } : {}) }, orderBy: { id: "asc" }, take: limit + 1, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}) });
  const page = rows.slice(0, limit); return ok(rid, { data: page.map(o => ({ id: o.id, ...view(o, site(req)) })), next_cursor: rows.length > limit ? page.at(-1)!.id : null });
}
const row = z.object({ order_no: z.string().trim().min(1).max(40), customer_name: z.string().trim().max(120).optional(), phone: z.string().trim().max(20).optional(), pincode: z.string().trim().max(10).optional(),
  payment_type: z.enum(["COD", "PREPAID"]), amount: z.number().min(0).max(10_000_000), awb: trackingIdSchema.optional(), whatsapp_consent: z.boolean().optional() });
// POST /api/v1/orders  { "orders": [ { order_no, payment_type, amount, ... } ] }  (up to 100). Repeating an order_no is ignored, so retries are safe.
export async function POST(req: NextRequest) {
  const a = await authenticate(req); if ("res" in a) return a.res; const { merchantId, plan, rid } = a.ctx;
  const p = z.object({ orders: z.array(row).min(1).max(100) }).safeParse(await req.json().catch(() => null)); if (!p.success) return err(rid, 400, "invalid_request", "Body must be { orders: [...] } with 1 to 100 valid orders.");
  const cap = (await getPlans())[plan].orders, have = await prisma.order.count({ where: { merchantId } });
  if (have + p.data.orders.length > cap) return err(rid, 402, "limit_reached", `Your plan allows ${cap} orders (you have ${have}).`);
  const res = await prisma.order.createMany({ skipDuplicates: true, data: p.data.orders.map(o => { const k = assessRisk({ paymentType: o.payment_type, amount: o.amount, phone: o.phone, pincode: o.pincode });
    return { merchantId, orderNo: o.order_no, customerName: o.customer_name, phone: o.phone, pincode: o.pincode, paymentType: o.payment_type, amount: o.amount, awb: o.awb, notifyOptIn: o.whatsapp_consent === true, riskLevel: k.level, riskReasons: k.reasons }; }) });
  return ok(rid, { data: { created: res.count, duplicates: p.data.orders.length - res.count } }, 201);
}
