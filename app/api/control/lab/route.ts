import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePerm } from "@/lib/auth/session";
import { listAdapters, getAdapter } from "@/lib/carriers/registry";
import { trackingIdSchema } from "@/lib/tracking/service";
import { TrackingError } from "@/lib/carriers/types";
import { loadCredentials } from "@/lib/carriers/credentials";
import { audit } from "@/lib/logging/audit";
export async function POST(req: NextRequest) {
  const g = await requirePerm("shipments"); if (g.error) return g.error;
  const p = z.object({ trackingId: trackingIdSchema, carrier: z.string().optional() }).safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ success: false, error: "INVALID_TRACKING_ID" }, { status: 400 });
  const { trackingId, carrier } = p.data;
  await loadCredentials();
  const detection = await Promise.all(listAdapters().map(async a => ({ ...(await a.detect(trackingId)) }))); detection.sort((a, b) => b.confidence - a.confidence);
  const code = carrier || detection[0]?.carrier; const a = code ? getAdapter(code) : undefined;
  if (!a) return NextResponse.json({ success: true, detection, result: "UNSUPPORTED_CARRIER" });
  const t0 = Date.now(); await audit(g.session!.user.email, "lab.run", req, "tracking", trackingId.slice(0, 4) + "…");
  try { const raw = await a.fetchTracking(trackingId);
    return NextResponse.json({ success: true, detection, carrier: a.code, latencyMs: Date.now() - t0, result: "OK", normalized: a.normalize(raw, trackingId), raw: raw.payload });
  } catch (e) { return NextResponse.json({ success: true, detection, carrier: a.code, latencyMs: Date.now() - t0, result: e instanceof TrackingError ? e.code : "INTERNAL_ERROR", detail: e instanceof TrackingError ? e.internal : String(e).slice(0, 200) }); }
}
