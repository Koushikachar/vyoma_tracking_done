import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createHash } from "crypto";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { audit } from "@/lib/logging/audit";
export async function POST(req: NextRequest) {
  const s = await getSession(); const jar = await cookies(); const t = jar.get("vr_session")?.value;
  if (t) await prisma.adminSession.deleteMany({ where: { tokenHash: createHash("sha256").update(t).digest("hex") } });
  jar.delete("vr_session"); if (s) await audit(s.user.email, "logout", req);
  return NextResponse.redirect(new URL("/", req.url), 303);
}
