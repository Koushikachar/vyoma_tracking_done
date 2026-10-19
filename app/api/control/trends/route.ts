import { NextRequest, NextResponse } from "next/server";
import { requirePerm } from "@/lib/auth/session";
import { getSettings } from "@/lib/settings";
import { getTrends, isRange } from "@/lib/trends";
export const dynamic = "force-dynamic";
// Used by the dashboard Trends card so switching Today / 7 days / 30 days … never reloads the page.
export async function GET(req: NextRequest) {
  let g = await requirePerm("dashboard"); if (g.error) g = await requirePerm("analytics"); if (g.error) return g.error;
  const range = req.nextUrl.searchParams.get("range") ?? "7d"; if (!isRange(range)) return NextResponse.json({ success: false, error: { message: "Invalid range." } }, { status: 400 });
  const { timeZone } = await getSettings();
  return NextResponse.json({ success: true, data: await getTrends(range, timeZone) }, { headers: { "cache-control": "no-store" } });
}
