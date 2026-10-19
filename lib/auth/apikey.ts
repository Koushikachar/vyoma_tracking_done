import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/db/prisma";
const sha = (s: string) => createHash("sha256").update(s).digest("hex");
export function generateKey() { const raw = "vr_live_" + randomBytes(24).toString("base64url"); return { raw, prefix: raw.slice(0, 12), keyHash: sha(raw) }; }
// Returns the ApiKey row for a valid, non-revoked Bearer token; plaintext keys are never stored.
export async function verifyBearer(req: Request) {
  const m = /^Bearer (vr_live_[A-Za-z0-9_-]{20,})$/.exec(req.headers.get("authorization") ?? ""); if (!m) return null;
  const k = await prisma.apiKey.findUnique({ where: { keyHash: sha(m[1]) } }); if (!k || k.revokedAt) return null;
  await prisma.apiKey.update({ where: { id: k.id }, data: { lastUsedAt: new Date() } }).catch(() => {}); return k;
}
