import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { track, hashId } from "@/lib/tracking/service";
import { rateLimit } from "@/lib/tracking/rate-limit";
import { verifyBearer } from "@/lib/auth/apikey";
import { getSettings } from "@/lib/settings";
import { saveLookup, saveShipment } from "@/lib/tracking/persist";
import { captureTrackingError } from "@/lib/sentry/capture";
import { TrackingError, SAFE_MESSAGES } from "@/lib/carriers/types";

export const maxDuration = 30;
export async function GET(req: NextRequest, { params }: { params: Promise<{ trackingId: string }> }) {
  const requestId = randomUUID(); const t0 = Date.now(); const { trackingId } = await params;
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  const idHash = hashId(trackingId); const h = { "x-request-id": requestId };
  let code = "OK"; let carrierCode: string | undefined; let source = "public"; let cause: unknown;
  try {
    if (req.headers.get("authorization")) {
      const k = await verifyBearer(req).catch(() => null);
      if (!k) { code = "UNAUTHORIZED"; return NextResponse.json({ success: false, error: { code, message: "Invalid API key." } }, { status: 401, headers: h }); }
      source = "api"; if (!(await rateLimit(`key:${k.id}`, 120))) throw new TrackingError("RATE_LIMITED", 429);
    }
    if (!(await rateLimit(`ip:${ip}`, (await getSettings()).publicRatePerMinute)) || !(await rateLimit(`id:${idHash}`, 10))) throw new TrackingError("RATE_LIMITED", 429);
    const wantsRefresh = req.nextUrl.searchParams.get("refresh") === "1";
    if (wantsRefresh && !(await rateLimit(`refresh:${ip}:${idHash}`, 3, 300_000))) throw new TrackingError("RATE_LIMITED", 429); // forced live lookups are capped harder
    const r = await track(trackingId, req.nextUrl.searchParams.get("carrier") ?? undefined, { refresh: wantsRefresh });
    carrierCode = r.carrierCode; if (r.live) await saveShipment(r.shipment, r.confidence);
    return NextResponse.json({ success: true, shipment: r.shipment, meta: r.meta }, { headers: { ...h, "cache-control": "no-store" } });
  } catch (e) {
    cause = e; const err = e instanceof TrackingError ? e : new TrackingError("INTERNAL_ERROR", 500); code = err.code;
    return NextResponse.json({ success: false, error: { code: err.code, message: SAFE_MESSAGES[err.code] } }, { status: err.http, headers: h });
  } finally {
    const latencyMs = Date.now() - t0;
    console.log(JSON.stringify({ requestId, idHash, carrierCode, result: code, latencyMs }));
    if (code === "INTERNAL_ERROR" || code === "PROVIDER_UNAVAILABLE") await captureTrackingError(cause, { carrier: carrierCode, idHash, requestId, latencyMs, code });
    await saveLookup({ trackingIdHash: idHash, carrierCode, success: code === "OK", errorCode: code === "OK" ? undefined : code, source, latencyMs, requestId });
  }
}
