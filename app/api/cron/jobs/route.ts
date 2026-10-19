import { NextRequest, NextResponse } from "next/server";
import { processJobs, scheduleRefreshes } from "@/lib/seller/jobs";
export const maxDuration = 60;
export async function GET(req: NextRequest) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return new NextResponse(null, { status: 401 });
  const scheduled = await scheduleRefreshes(); return NextResponse.json({ scheduled, ...(await processJobs()) });
}
