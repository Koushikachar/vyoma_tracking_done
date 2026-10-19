import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requirePerm } from "@/lib/auth/session";
import { generateKey } from "@/lib/auth/apikey";
import { audit } from "@/lib/logging/audit";
const same = (r: NextRequest) => { const o = r.headers.get("origin"); return !o || o === r.nextUrl.origin; };
export async function POST(req: NextRequest) {
  if (!same(req)) return new Response(null, { status: 403 }); const g = await requirePerm("apikeys"); if (g.error) return g.error;
  const p = z.object({ name: z.string().trim().min(2).max(60) }).safeParse(await req.json().catch(() => null)); if (!p.success) return NextResponse.json({ success: false }, { status: 400 });
  const k = generateKey(); const row = await prisma.apiKey.create({ data: { name: p.data.name, keyHash: k.keyHash, prefix: k.prefix } });
  await audit(g.session!.user.email, "apikey.created", req, "apikey", row.id);
  return NextResponse.json({ success: true, key: k.raw, note: "Shown once. Store it now." }); // only time plaintext exists
}
export async function DELETE(req: NextRequest) {
  if (!same(req)) return new Response(null, { status: 403 }); const g = await requirePerm("apikeys"); if (g.error) return g.error;
  const p = z.object({ id: z.string() }).safeParse(await req.json().catch(() => null)); if (!p.success) return NextResponse.json({ success: false }, { status: 400 });
  await prisma.apiKey.update({ where: { id: p.data.id }, data: { revokedAt: new Date() } }); await audit(g.session!.user.email, "apikey.revoked", req, "apikey", p.data.id);
  return NextResponse.json({ success: true });
}
