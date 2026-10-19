import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { canDo } from "@/lib/seller/roles";
import { getMerchant } from "@/lib/seller/auth";
const fail = (message: string, status = 400) => NextResponse.json({ success: false, error: { message } }, { status });
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
// The browser resizes the picture to a PNG first; the server still checks the real file signature and size (never trusts the upload).
export async function POST(req: NextRequest) {
  const m = await getMerchant(); if (!m) return fail("Please sign in.", 401); if (!m.verified) return fail("Please verify your email first.", 403);
  if (!canDo(m.role, "brand.write")) return fail("Your role does not allow this.", 403);
  if (m.plan === "FREE") return fail("A brand logo is part of the Growth plan.", 402);
  const buf = Buffer.from(await req.arrayBuffer()); if (!buf.length || buf.length > 200_000) return fail("The logo must be smaller than 200 KB.");
  if (!PNG.every((b, i) => buf[i] === b)) return fail("Please upload a PNG, JPG or WebP image.");
  await prisma.merchantLogo.upsert({ where: { merchantId: m.id }, create: { merchantId: m.id, data: buf }, update: { data: buf } }); return NextResponse.json({ success: true });
}
export async function DELETE() { const m = await getMerchant(); if (!m) return fail("Please sign in.", 401); await prisma.merchantLogo.deleteMany({ where: { merchantId: m.id } }); return NextResponse.json({ success: true }); }
