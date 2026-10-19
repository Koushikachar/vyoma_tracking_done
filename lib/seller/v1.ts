import { NextRequest, NextResponse } from "next/server";
import { createHash, randomUUID } from "crypto";
import { prisma } from "@/lib/db/prisma";
import { rateLimit } from "@/lib/tracking/rate-limit";
import { activePlan, type Plan } from "@/lib/seller/plans";
import { parseBearer } from "@/lib/seller/apikey-format";
export const sha = (s: string) => createHash("sha256").update(s).digest("hex");
export type Ctx = { merchantId: string; plan: Plan; rid: string };
const H = (rid: string) => ({ "x-request-id": rid, "cache-control": "no-store" });
export const err = (rid: string, status: number, code: string, message: string) => NextResponse.json({ error: { code, message }, request_id: rid }, { status, headers: H(rid) });
export const ok = (rid: string, data: object, status = 200) => NextResponse.json({ ...data, request_id: rid }, { status, headers: H(rid) });
// Every /api/v1 call: key check, plan check, per-key rate limit, request id on every response.
export async function authenticate(req: NextRequest): Promise<{ ctx: Ctx } | { res: NextResponse }> {
  const rid = randomUUID(); const key = parseBearer(req.headers.get("authorization")); if (!key) return { res: err(rid, 401, "unauthorized", "Send your API key as: Authorization: Bearer <key>") };
  const row = await prisma.sellerApiKey.findUnique({ where: { keyHash: sha(key) }, include: { merchant: true } });
  if (!row || row.revokedAt || row.merchant.suspendedAt || !row.merchant.emailVerifiedAt) return { res: err(rid, 401, "unauthorized", "Invalid or revoked API key.") };
  const plan = activePlan(row.merchant); if (plan === "FREE") return { res: err(rid, 402, "plan_required", "API access is part of the Growth plan.") };
  if (!(await rateLimit(`v1:${row.id}`, 120, 60_000))) return { res: err(rid, 429, "rate_limited", "Too many requests. The limit is 120 per minute.") };
  if (!row.lastUsedAt || Date.now() - +row.lastUsedAt > 60_000) await prisma.sellerApiKey.update({ where: { id: row.id }, data: { lastUsedAt: new Date() } }).catch(() => {});
  return { ctx: { merchantId: row.merchantId, plan, rid } };
}
// What the API returns for an order. Deliberately leaves out the customer's name, phone and address.
export const view = (o: any, site: string) => ({ order_no: o.orderNo, status: o.status, awb: o.awb, carrier: o.carrierName ?? o.carrierCode, payment_type: o.paymentType, amount: Number(o.amount), risk_level: o.riskLevel, cod_verification: o.codStatus, created_at: o.createdAt.toISOString(), tracking_url: o.trackToken ? `${site}/t/${o.trackToken}` : null });
