import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/db/prisma";
const A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 32 chars: uniform with x % 32
const norm = (c: string) => c.toUpperCase().replace(/[^A-Z0-9]/g, "");
export const hashCode = (c: string) => createHash("sha256").update(norm(c)).digest("hex");
export function generateCodes(n = 10) { return Array.from({ length: n }, () => { const s = [...randomBytes(10)].map(x => A[x % 32]).join(""); return `${s.slice(0, 5)}-${s.slice(5)}`; }); }
// Only hashes are stored: codes can't be recovered, only shown once at creation.
export async function setRecoveryCodes(userId: string) { const codes = generateCodes(); await prisma.adminUser.update({ where: { id: userId }, data: { recoveryHashes: codes.map(hashCode) } }); return codes; }
// One-time use; the conditional update stops two parallel requests spending the same code.
export async function consumeRecovery(userId: string, code: string) {
  const h = hashCode(code); const u = await prisma.adminUser.findUnique({ where: { id: userId } }); if (!u?.recoveryHashes.includes(h)) return false;
  return (await prisma.adminUser.updateMany({ where: { id: userId, recoveryHashes: { has: h } }, data: { recoveryHashes: u.recoveryHashes.filter(x => x !== h) } })).count === 1;
}
