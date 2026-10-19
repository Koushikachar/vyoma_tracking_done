import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { getMerchant } from "@/lib/seller/auth";
import { audit } from "@/lib/seller/audit";
import { canDo } from "@/lib/seller/roles";
import { sha } from "@/lib/seller/v1";
import { rateLimit } from "@/lib/tracking/rate-limit";
const body = z.discriminatedUnion("action", [z.object({ action: z.literal("create"), name: z.string().trim().min(2).max(40) }), z.object({ action: z.literal("revoke"), id: z.string().min(5).max(40) })]);
const fail = (message: string, status = 400) => NextResponse.json({ success: false, error: { message } }, { status });
export async function POST(req: NextRequest) {
  const m = await getMerchant(); if (!m) return fail("Please sign in.", 401); if (!m.verified) return fail("Please verify your email first.", 403);
  if (!canDo(m.role, "connections.write")) return fail("Your role does not allow this.", 403); if (m.plan === "FREE") return fail("API access is part of the Growth plan.", 402);
  if (!(await rateLimit(`apikeys:${m.id}`, 20, 600_000))) return fail("Too many requests. Please wait a few minutes.", 429);
  const p = body.safeParse(await req.json().catch(() => null)); if (!p.success) return fail("Please give the key a name."); const d = p.data;
  if (d.action === "revoke") { const r = await prisma.sellerApiKey.updateMany({ where: { id: d.id, merchantId: m.id, revokedAt: null }, data: { revokedAt: new Date() } }); if (!r.count) return fail("Key not found.", 404); await audit(m.id, "apikey.revoke", "apiKey", d.id); return NextResponse.json({ success: true }); }
  if ((await prisma.sellerApiKey.count({ where: { merchantId: m.id, revokedAt: null } })) >= 5) return fail("You can have up to 5 active keys. Revoke one first.");
  const key = `vr_live_${randomBytes(24).toString("base64url")}`; const row = await prisma.sellerApiKey.create({ data: { merchantId: m.id, name: d.name, prefix: key.slice(0, 12), keyHash: sha(key), createdBy: m.email } });
  await audit(m.id, "apikey.create", "apiKey", row.id, d.name); return NextResponse.json({ success: true, key }); // the only time the key is ever shown
}
