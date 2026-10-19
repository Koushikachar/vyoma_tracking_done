import { prisma } from "@/lib/db/prisma";
// Best effort: a failed audit write must never break the action it describes. Keep `detail` free of secrets and personal data.
export async function audit(merchantId: string, action: string, entity?: string, entityId?: string, detail?: string) {
  try { await prisma.sellerAudit.create({ data: { merchantId, action, entity, entityId, detail: detail?.slice(0, 200) } }); } catch (e) { console.error("[audit]", (e as Error).message); }
}
