import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; if (!/^[a-z0-9]{10,40}$/i.test(id)) return new NextResponse(null, { status: 404 });
  const l = await prisma.merchantLogo.findUnique({ where: { merchantId: id } }); if (!l) return new NextResponse(null, { status: 404 });
  return new NextResponse(new Uint8Array(l.data), { headers: { "content-type": "image/png", "cache-control": "public, max-age=3600", "x-content-type-options": "nosniff", "content-security-policy": "default-src 'none'" } });
}
