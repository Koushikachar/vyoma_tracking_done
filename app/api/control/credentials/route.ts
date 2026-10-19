import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requirePerm } from "@/lib/auth/session";
import { encrypt } from "@/lib/encryption/aes";
import { invalidateCredentials } from "@/lib/carriers/credentials";
import { audit } from "@/lib/logging/audit";
const NAMES: Record<string, string> = { delhivery: "Delhivery", ship24: "Ship24", dhl: "DHL", fedex: "FedEx", ups: "UPS" };
const save = z.object({ carrierCode: z.enum(["delhivery", "ship24", "dhl", "fedex", "ups"]), token: z.string().trim().min(8).max(500), baseUrl: z.string().url().optional() });
const guard = async (req: NextRequest) => { const o = req.headers.get("origin"); if (o && o !== req.nextUrl.origin) return { error: new Response(null, { status: 403 }) }; return requirePerm("carriers"); };
// Secrets are write-only: no endpoint ever returns a stored token.
export async function POST(req: NextRequest) {
  const g = await guard(req); if (g.error) return g.error; invalidateCredentials();
  const p = save.safeParse(await req.json().catch(() => null)); if (!p.success) return NextResponse.json({ success: false }, { status: 400 });
  const c = await prisma.carrier.upsert({ where: { code: p.data.carrierCode }, update: {}, create: { code: p.data.carrierCode, name: NAMES[p.data.carrierCode] } });
  await prisma.carrierCredential.deleteMany({ where: { carrierId: c.id } });
  await prisma.carrierCredential.create({ data: { carrierId: c.id, encryptedToken: encrypt(p.data.token), baseUrl: p.data.baseUrl } });
  await audit(g.session!.user.email, "apikey.saved", req, "carrier", p.data.carrierCode);
  return NextResponse.json({ success: true });
}
export async function DELETE(req: NextRequest) {
  const g = await guard(req); if (g.error) return g.error; invalidateCredentials();
  const p = z.object({ carrierCode: z.enum(["delhivery", "ship24", "dhl", "fedex", "ups"]) }).safeParse(await req.json().catch(() => null)); if (!p.success) return NextResponse.json({ success: false }, { status: 400 });
  const c = await prisma.carrier.findUnique({ where: { code: p.data.carrierCode } });
  if (c) await prisma.carrierCredential.deleteMany({ where: { carrierId: c.id } });
  await audit(g.session!.user.email, "apikey.deleted", req, "carrier", p.data.carrierCode);
  return NextResponse.json({ success: true });
}

import { loadCredentials } from "@/lib/carriers/credentials";
import { getAdapter } from "@/lib/carriers/registry";
import { TrackingError } from "@/lib/carriers/types";
// Test connection: a harmless lookup of a dummy ID. "Not found" proves the key was accepted; anything else means rejected/unavailable.
export async function PUT(req: NextRequest) {
  const g = await guard(req); if (g.error) return g.error;
  const p = z.object({ carrierCode: z.enum(["delhivery", "ship24", "dhl", "fedex", "ups"]) }).safeParse(await req.json().catch(() => null)); if (!p.success) return NextResponse.json({ success: false }, { status: 400 });
  invalidateCredentials(); await loadCredentials(); const a = getAdapter(p.data.carrierCode); await audit(g.session!.user.email, "carrier.tested", req, "carrier", p.data.carrierCode);
  if (!a) return NextResponse.json({ success: true, ok: false, message: "No key configured." });
  const t0 = Date.now(); const ms = () => `${Date.now() - t0} ms`;
  try { await a.fetchTracking("0000000000000"); return NextResponse.json({ success: true, ok: true, message: `Connected (${ms()}).` }); }
  catch (e) { const c = e instanceof TrackingError ? e.code : "";
    if (c === "SHIPMENT_NOT_FOUND") return NextResponse.json({ success: true, ok: true, message: `Connected: key accepted (${ms()}).` });
    if (c === "RATE_LIMITED") return NextResponse.json({ success: true, ok: true, message: "Key reached the carrier, but it is rate limiting right now." });
    return NextResponse.json({ success: true, ok: false, message: "The carrier rejected the key or is unavailable. Re-check the key." + (e instanceof TrackingError && e.internal ? ` (${e.internal})` : "") }); }
}
