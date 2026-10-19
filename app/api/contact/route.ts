import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { notifyAdmin } from "@/lib/email";
import { rateLimit } from "@/lib/tracking/rate-limit";
const schema = z.object({ name: z.string().trim().min(2).max(80), email: z.string().email().max(120), company: z.string().max(80).optional(), message: z.string().trim().min(10).max(2000), website: z.string().max(0).optional(), token: z.string().optional() });
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  if (!(await rateLimit(`contact:${ip}`, 5, 3600_000))) return NextResponse.json({ success: false, error: "RATE_LIMITED" }, { status: 429 });
  const p = schema.safeParse(await req.json().catch(() => null)); if (!p.success) return NextResponse.json({ success: false, error: "INVALID_INPUT" }, { status: 400 }); // honeypot "website" must be empty
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) { if (process.env.NODE_ENV === "production") return NextResponse.json({ success: false, error: "UNAVAILABLE" }, { status: 503 }); }
  else { const v = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: new URLSearchParams({ secret, response: p.data.token ?? "", remoteip: ip }) }).then(r => r.json()).catch(() => null);
    if (!v?.success) return NextResponse.json({ success: false, error: "CAPTCHA_FAILED" }, { status: 400 }); }
  const { name, email, company, message } = p.data; await prisma.contactMessage.create({ data: { name, email, company, message } });
  await notifyAdmin(name, email, company, message); // best-effort; never blocks or fails the request
  return NextResponse.json({ success: true });
}
