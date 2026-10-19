import { prisma } from "@/lib/db/prisma";
import { decrypt } from "@/lib/encryption/aes";
type Cred = { token: string; baseUrl?: string };
const clean = (t?: string) => t?.trim().replace(/^Bearer\s+/i, "") || undefined; // pasted keys often carry spaces/newlines or a "Bearer " prefix
const envToken = (code: string) => clean(envTokenRaw(code));
const envTokenRaw = (code: string) => { const e = process.env; switch (code) { case "delhivery": return e.DELHIVERY_API_KEY; case "ship24": return e.SHIP24_API_KEY; case "dhl": return e.DHL_API_KEY;
  case "fedex": return e.FEDEX_API_KEY && e.FEDEX_API_SECRET ? `${e.FEDEX_API_KEY}:${e.FEDEX_API_SECRET}` : undefined; case "ups": return e.UPS_CLIENT_ID && e.UPS_CLIENT_SECRET ? `${e.UPS_CLIENT_ID}:${e.UPS_CLIENT_SECRET}` : undefined; } };
let db = new Map<string, Cred>(); let loadedAt = 0;
export const invalidateCredentials = () => { loadedAt = 0; };
export function safeBaseUrl(u: string | null | undefined, domain: string) {
  if (!u) return undefined; try { const x = new URL(u); return x.protocol === "https:" && (x.hostname === domain || x.hostname.endsWith("." + domain)) ? x.origin : undefined; } catch { return undefined; }
}
// Admin-saved (encrypted) keys are loaded into memory server-side, refreshed every 60s. Env vars take precedence.
export async function loadCredentials() {
  if (Date.now() - loadedAt < 60_000 || !process.env.DATABASE_URL || !process.env.CARRIER_CREDENTIAL_ENCRYPTION_KEY) return;
  try { const rows = await prisma.carrierCredential.findMany({ include: { carrier: true } }); const m = new Map<string, Cred>();
    for (const r of rows) { try { m.set(r.carrier.code, { token: clean(decrypt(r.encryptedToken)) ?? "", baseUrl: r.baseUrl ?? undefined }); } catch {} }
    db = m; loadedAt = Date.now(); } catch {}
}
export function getCred(code: string): Cred | undefined { const t = envToken(code); return t ? { token: t } : db.get(code); }
