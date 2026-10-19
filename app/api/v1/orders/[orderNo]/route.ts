import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { authenticate, err, ok, view } from "@/lib/seller/v1";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest, { params }: { params: Promise<{ orderNo: string }> }) {
  const a = await authenticate(req); if ("res" in a) return a.res; const { orderNo } = await params;
  const o = await prisma.order.findUnique({ where: { merchantId_orderNo: { merchantId: a.ctx.merchantId, orderNo: decodeURIComponent(orderNo) } } }); // always scoped to the key's own workspace
  return o ? ok(a.ctx.rid, { data: view(o, process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin) }) : err(a.ctx.rid, 404, "not_found", "No order with that order_no.");
}
