import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { rateLimit } from "@/lib/tracking/rate-limit";
const body = z.object({ token: z.string().min(10).max(64), choice: z.enum(["REATTEMPT", "UPDATE_ADDRESS", "CANCEL"]), note: z.string().trim().max(300).optional() });
const fail = (message: string, status = 400) => NextResponse.json({ success: false, error: { message } }, { status });
// Public endpoint: the unguessable token in the link is the only credential, so it only records a choice (never reads personal data).
export async function POST(req: NextRequest) {
  const p = body.safeParse(await req.json().catch(() => null)); if (!p.success) return fail("Please choose an option.");
  const { token, choice, note } = p.data; if (choice === "UPDATE_ADDRESS" && (note?.length ?? 0) < 10) return fail("Please type your full corrected address.");
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!(await rateLimit(`ndr-reply:${ip}`, 10, 10 * 60_000))) return fail("Too many attempts. Please try again later.", 429);
  const c = await prisma.ndrCase.findFirst({ where: { status: { not: "RESOLVED" }, order: { trackToken: token } } });
  if (!c) return fail("This delivery request is no longer open.", 404);
  await prisma.ndrCase.update({ where: { id: c.id }, data: { customerChoice: choice, customerNote: note || null, status: "CUSTOMER_REPLIED", repliedAt: new Date() } });
  return NextResponse.json({ success: true });
}
