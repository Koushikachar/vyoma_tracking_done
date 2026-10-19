import { NextRequest, NextResponse } from "next/server";
import { purgeRateLimits } from "@/lib/tracking/rate-limit";
import { checkCarrierHealth } from "@/lib/alerts";
import { purgeOld } from "@/lib/retention";
import { processPending } from "@/lib/webhooks/process";
export async function GET(req: NextRequest) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return new NextResponse(null, { status: 401 });
  await purgeRateLimits(); const purged = await purgeOld(); await checkCarrierHealth().catch(() => {});
  return NextResponse.json({ processed: await processPending(), purged });
}
