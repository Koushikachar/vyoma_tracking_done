import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requirePerm } from "@/lib/auth/session";
import { audit } from "@/lib/logging/audit";
export async function POST(req: NextRequest) { // manual replay of a failed/dead event
  const o = req.headers.get("origin"); if (o && o !== req.nextUrl.origin) return new Response(null, { status: 403 });
  const g = await requirePerm("webhooks"); if (g.error) return g.error;
  const p = z.object({ id: z.string() }).safeParse(await req.json().catch(() => null)); if (!p.success) return NextResponse.json({ success: false }, { status: 400 });
  await prisma.webhookEvent.update({ where: { id: p.data.id }, data: { status: "pending", attempts: 0, nextAttemptAt: null, error: null } });
  await audit(g.session!.user.email, "webhook.replayed", req, "webhook", p.data.id); return NextResponse.json({ success: true });
}
