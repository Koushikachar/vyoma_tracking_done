import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/db/prisma";
export async function POST(req: NextRequest, { params }: { params: Promise<{ carrier: string }> }) {
  const { carrier } = await params;
  const secret = process.env[`WEBHOOK_SECRET_${carrier.toUpperCase().replace(/[^A-Z0-9]/g, "_")}`];
  if (!secret) return NextResponse.json({ success: false }, { status: 404 }); // unconfigured carrier: not live
  const raw = await req.text(); const sig = req.headers.get("x-vyoma-signature") ?? ""; const ts = Number(req.headers.get("x-vyoma-timestamp"));
  if (!ts || Math.abs(Date.now() - ts) > 5 * 60_000) return NextResponse.json({ success: false }, { status: 400 }); // replay window
  const exp = createHmac("sha256", secret).update(`${ts}.${raw}`).digest("hex");
  if (sig.length !== exp.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(exp))) return NextResponse.json({ success: false }, { status: 401 });
  let payload: any; try { payload = JSON.parse(raw); } catch { return NextResponse.json({ success: false }, { status: 400 }); }
  const eventId = String(payload?.eventId ?? ""); if (!eventId) return NextResponse.json({ success: false }, { status: 400 });
  try { await prisma.webhookEvent.create({ data: { carrier, eventId, payload, signature: sig } }); }
  catch { return NextResponse.json({ success: true, duplicate: true }); } // idempotent: unique(carrier,eventId)
  // TODO: worker applies event with exponential backoff, dead-letters after N attempts.
  return NextResponse.json({ success: true });
}
