import { pageGuard } from "@/lib/auth/guard";
import { prisma } from "@/lib/db/prisma";
import { emailProvider } from "@/lib/email-config";
import { activePlan } from "@/lib/seller/plans";
import SellersAdmin from "@/components/admin/SellersAdmin";
export const dynamic = "force-dynamic";
const ready = (...v: (string | undefined)[]) => v.every(Boolean); // only true/false is shown, never the secret itself
export default async function P({ params }: { params: Promise<{ route: string }> }) {
  await pageGuard((await params).route, "sellers"); const since = new Date(Date.now() - 30 * 864e5);
  const [ms, pays, revenue, openNdr, orders] = await Promise.all([
    prisma.merchant.findMany({ orderBy: { createdAt: "desc" }, take: 300, include: { _count: { select: { orders: true } }, payments: { select: { amountPaise: true } } } }),
    prisma.payment.findMany({ orderBy: { paidAt: "desc" }, take: 15, include: { merchant: { select: { email: true } } } }),
    prisma.payment.aggregate({ where: { paidAt: { gte: since } }, _sum: { amountPaise: true } }),
    prisma.ndrCase.count({ where: { status: { not: "RESOLVED" } } }), prisma.order.count(),
  ]);
  const act = (await prisma.sellerAudit.findMany({ orderBy: { createdAt: "desc" }, take: 20, include: { merchant: { select: { email: true } } } })).map(a => ({ id: a.id, email: a.merchant.email, action: a.action, detail: a.detail, at: a.createdAt.toISOString() }));
  const sellers = ms.map(m => ({ id: m.id, email: m.email, name: m.name, plan: activePlan(m), planUntil: m.planUntil?.toISOString() ?? null, verified: !!m.emailVerifiedAt, mfa: !!m.mfaEnabledAt, suspended: !!m.suspendedAt, orders: m._count.orders, paid: m.payments.reduce((s, p) => s + p.amountPaise, 0) / 100, createdAt: m.createdAt.toISOString() }));
  const status: [string, boolean, string][] = [[`Email${emailProvider() ? ` (${emailProvider()})` : ""}`, !!emailProvider(), "Verification, reset and invitation emails"], ["Razorpay", ready(process.env.RAZORPAY_KEY_ID, process.env.RAZORPAY_KEY_SECRET, process.env.RAZORPAY_WEBHOOK_SECRET), "Plan payments"],
    ["WhatsApp", ready(process.env.WHATSAPP_TOKEN, process.env.WHATSAPP_PHONE_ID, process.env.WHATSAPP_APP_SECRET, process.env.WHATSAPP_VERIFY_TOKEN), "COD checks and NDR messages"], ["Encryption key", ready(process.env.CARRIER_CREDENTIAL_ENCRYPTION_KEY), "Stored seller keys"]];
  const payments = pays.map(p => ({ id: p.id, email: p.merchant.email, plan: p.plan, amount: p.amountPaise / 100, at: p.paidAt.toISOString() }));
  const kpis: [string, string][] = [["Sellers", String(sellers.length)], ["On a paid plan", String(sellers.filter(s => s.plan !== "FREE").length)], ["Not verified", String(sellers.filter(s => !s.verified).length)], ["Revenue, 30 days", `₹${((revenue._sum.amountPaise ?? 0) / 100).toLocaleString("en-IN")}`], ["Open NDR cases", String(openNdr)], ["Seller orders", orders.toLocaleString("en-IN")]];
  return <div className="p-5 md:p-8 mx-auto w-full max-w-6xl"><h1 className="text-3xl font-bold">Sellers</h1><p className="mt-1 mb-6 text-sm text-muted">Everyone using the seller workspace, their plans and payments.</p>
    <SellersAdmin sellers={sellers} payments={payments} status={status} kpis={kpis} activity={act} /></div>;
}
