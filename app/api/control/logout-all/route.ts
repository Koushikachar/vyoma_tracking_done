import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSession, logoutAll } from "@/lib/auth/session"; import { audit } from "@/lib/logging/audit";
export async function POST(req: NextRequest) {
  const s = await getSession(); if (!s) return new NextResponse(null, { status: 401 });
  await logoutAll(s.user.id); (await cookies()).delete("vr_session"); await audit(s.user.email, "logout.all", req); return NextResponse.redirect(new URL("/", req.url), 303);
}
