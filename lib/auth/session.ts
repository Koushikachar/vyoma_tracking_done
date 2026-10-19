import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import { can, Perm, Role } from "./rbac";
const COOKIE = "vr_session"; const TTL = 8 * 3600_000;
const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const sign = (v: string) => createHmac("sha256", process.env.AUTH_SECRET!).update(v).digest("base64url");

// Short-lived token proving step 1 (password) passed; required for step 2 (TOTP).
export const makePending = (userId: string) => { const v = `${userId}.${Date.now() + 5 * 60_000}`; return `${v}.${sign(v)}`; };
export function readPending(tok: string) {
  const i = tok.lastIndexOf("."); const v = tok.slice(0, i), s = Buffer.from(tok.slice(i + 1)), e = Buffer.from(sign(v));
  if (s.length !== e.length || !timingSafeEqual(s, e)) return null;
  const [uid, exp] = v.split("."); return Number(exp) > Date.now() ? uid : null;
}
// New random token on every login = no session fixation.
export async function createSession(userId: string, ip?: string, ua?: string) {
  const token = randomBytes(32).toString("base64url");
  await prisma.adminSession.create({ data: { userId, tokenHash: sha(token), expiresAt: new Date(Date.now() + TTL), ip, userAgent: ua } });
  (await cookies()).set(COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: TTL / 1000 });
}
export async function getSession() {
  const t = (await cookies()).get(COOKIE)?.value; if (!t) return null;
  const s = await prisma.adminSession.findUnique({ where: { tokenHash: sha(t) } });
  if (!s || s.expiresAt < new Date()) return null;
  const u = await prisma.adminUser.findUnique({ where: { id: s.userId } });
  return u ? { user: { id: u.id, email: u.email, role: u.role as Role }, sessionId: s.id } : null;
}
// Every admin API handler calls this first. Never rely on hidden UI.
export async function requirePerm(p: Perm) {
  const s = await getSession();
  if (!s) return { error: new Response(JSON.stringify({ success: false, error: { code: "UNAUTHORIZED" } }), { status: 401 }) };
  if (!can(s.user.role, p)) return { error: new Response(JSON.stringify({ success: false, error: { code: "FORBIDDEN" } }), { status: 403 }) };
  return { session: s };
}
export async function logoutAll(userId: string) { await prisma.adminSession.deleteMany({ where: { userId } }); }
