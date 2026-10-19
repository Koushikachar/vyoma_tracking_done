import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requirePerm } from "@/lib/auth/session";
import { buildWhere } from "@/lib/shipments-filter";
import { audit } from "@/lib/logging/audit";
// Same filters as the Shipments page. Capped at 5000 rows. Cells starting with = + - @ are neutralised (CSV/formula injection).
const esc = (v: unknown) => { let s = v instanceof Date ? v.toISOString() : String(v ?? ""); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
export async function GET(req: NextRequest) {
  const g = await requirePerm("shipments.read"); if (g.error) return g.error;
  const rows = await prisma.shipment.findMany({ where: buildWhere(Object.fromEntries(req.nextUrl.searchParams)), orderBy: { updatedAt: "desc" }, take: 5000 });
  const head = ["trackingId", "carrier", "status", "rawStatus", "origin", "destination", "estimatedDelivery", "lastUpdated", "created"];
  const csv = [head.join(","), ...rows.map(r => [r.trackingId, r.carrierName, r.currentStatus, r.currentStatusRaw, r.origin, r.destination, r.estimatedDeliveryAt, r.lastUpdatedAt, r.createdAt].map(esc).join(","))].join("\n");
  await audit(g.session!.user.email, "shipments.exported", req, "shipments", String(rows.length));
  return new Response(csv, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="shipments-${new Date().toISOString().slice(0, 10)}.csv"`, "cache-control": "no-store" } });
}
