import { NextRequest, NextResponse } from "next/server";
import { requirePerm } from "@/lib/auth/session";
import { settingsSchema, saveSettings } from "@/lib/settings";
import { audit } from "@/lib/logging/audit";
export async function POST(req: NextRequest) {
  const o = req.headers.get("origin"); if (o && o !== req.nextUrl.origin) return new Response(null, { status: 403 });
  const g = await requirePerm("settings"); if (g.error) return g.error;
  const p = settingsSchema.safeParse(await req.json().catch(() => null)); if (!p.success) return NextResponse.json({ success: false, error: { message: "Invalid settings." } }, { status: 400 });
  await saveSettings(p.data); await audit(g.session!.user.email, "settings.changed", req, "settings", "app"); return NextResponse.json({ success: true });
}
