import { Prisma, ShipmentStatus } from "@prisma/client";
export const STATUS_LIST = Object.values(ShipmentStatus) as string[];
export type SP = { q?: string; status?: string; carrier?: string; mode?: string; from?: string; to?: string; page?: string };
const date = (s?: string) => { const d = s ? new Date(s) : null; return d && !isNaN(+d) ? d : undefined; };
export function buildWhere(sp: SP): Prisma.ShipmentWhereInput {
  const w: Prisma.ShipmentWhereInput = {};
  if (sp.q) w.trackingId = { contains: sp.q.slice(0, 40), mode: "insensitive" };
  if (sp.status && STATUS_LIST.includes(sp.status)) w.currentStatus = sp.status as ShipmentStatus;
  if (sp.carrier) w.carrierCode = sp.carrier.slice(0, 40); else if (sp.mode === "test") w.carrierCode = "vyoma_test"; else if (sp.mode === "live") w.carrierCode = { not: "vyoma_test" };
  const f = date(sp.from), t = date(sp.to); if (f || t) w.createdAt = { ...(f && { gte: f }), ...(t && { lte: new Date(+t + 86400_000 - 1) }) };
  return w;
}
