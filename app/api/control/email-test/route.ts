import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requirePerm } from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/password";
import { rateLimit } from "@/lib/tracking/rate-limit";
import { audit } from "@/lib/logging/audit";
import { emailProvider, sendEmail } from "@/lib/email";
const no = (s: number, m: string) => NextResponse.json({ success: false, error: { message: m } }, { status: s });
// Sends one test email to the signed-in admin so a broken email set-up can be diagnosed without waiting for a seller to hit it.
export async function POST(req: NextRequest) {
  const o = req.headers.get("origin"); if (o && o !== req.nextUrl.origin) return no(403, "Forbidden");
  const g = await requirePerm("sellers"); if (g.error) return g.error; const me = g.session!.user;
  if (!(await rateLimit(`emailtest:${me.id}`, 5, 600_000))) return no(429, "Too many tests. Please wait a few minutes.");
  const p = z.object({ current: z.string().min(1).max(200) }).safeParse(await req.json().catch(() => null)); if (!p.success) return no(400, "Enter your password.");
  const self = await prisma.adminUser.findUnique({ where: { id: me.id } }); if (!self || !verifyPassword(p.data.current, self.passwordHash)) return no(403, "Your password is incorrect.");
  const prov = emailProvider(); if (!prov) return no(400, "No email service is set up. Set EMAIL_FROM plus BREVO_API_KEY, RESEND_API_KEY or EMAIL_SERVER.");
  try { await sendEmail({ to: me.email, subject: "Vyoma Route test email", text: "If you can read this, seller emails are working.", html: "<p>If you can read this, seller emails are working.</p>" }); await audit(me.email, "email.test.ok", req); return NextResponse.json({ success: true, provider: prov, to: me.email }); }
  catch (e) { await audit(me.email, "email.test.failed", req); return no(502, `The ${prov} service refused the email: ${(e as Error).message.slice(0, 200)}`); }
}
