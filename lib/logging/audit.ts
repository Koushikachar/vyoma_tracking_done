import { prisma } from "@/lib/db/prisma";
export async function audit(actor: string, action: string, req?: Request, resource?: string, resourceId?: string) {
  try { await prisma.auditLog.create({ data: { actor, action, resource, resourceId,
    ip: req?.headers.get("x-forwarded-for")?.split(",")[0].trim(), userAgent: req?.headers.get("user-agent")?.slice(0, 200) } }); } catch {}
}
