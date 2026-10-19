import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db/prisma";
import { getMerchant } from "@/lib/seller/auth";
import { getPlans } from "@/lib/seller/plans-db";
import { canDo } from "@/lib/seller/roles";
import VerifyGate from "@/components/seller/VerifyGate";
import { waEnabled } from "@/lib/whatsapp";
import SellerApp from "@/components/seller/SellerApp";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Seller workspace", robots: { index: false } };
export default async function SellerPage({ searchParams }: { searchParams: Promise<{ paid?: string }> }) {
  const m = await getMerchant(); if (!m) redirect("/seller/login");
  if (!m.verified) return <VerifyGate email={m.email} />;
  const logo = await prisma.merchantLogo.findUnique({ where: { merchantId: m.id }, select: { updatedAt: true } });
  const cx = await prisma.connection.findMany({ where: { merchantId: m.id }, select: { kind: true, shopUrl: true, lastSyncAt: true } });
  const conn = { delhivery: cx.some(c => c.kind === "DELHIVERY"), woo: cx.find(c => c.kind === "WOOCOMMERCE")?.shopUrl ?? null, wooSynced: cx.find(c => c.kind === "WOOCOMMERCE")?.lastSyncAt?.toISOString() ?? null };
  const [codRows, wRows] = await Promise.all([prisma.codLine.findMany({ where: { merchantId: m.id }, orderBy: { createdAt: "desc" }, take: 300 }), prisma.weightCase.findMany({ where: { merchantId: m.id }, orderBy: { createdAt: "desc" }, take: 300 })]);
  const codSaved = codRows.map(c => ({ id: c.id, awb: c.awb, orderNo: c.orderNo, expected: Number(c.expected), received: Number(c.received), diff: Number(c.diff), ref: c.ref, kind: c.kind, status: c.status, note: c.note }));
  const weightSaved = wRows.map(c => ({ id: c.id, awb: c.awb, billedKg: c.billedKg, expectedKg: c.expectedKg, excessKg: c.excessKg, reason: c.reason, status: c.status, note: c.note }));
  const [memRows, invRows, pickRows] = await Promise.all([prisma.teamMember.findMany({ where: { merchantId: m.id }, orderBy: { createdAt: "asc" } }),
    prisma.teamInvite.findMany({ where: { merchantId: m.id, usedAt: null, expiresAt: { gt: new Date() } }, orderBy: { createdAt: "desc" } }), prisma.pickupLocation.findMany({ where: { merchantId: m.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }] })]);
  const plans = await getPlans();
  const [rateRows, noteRows] = await Promise.all([prisma.rateCard.findMany({ where: { merchantId: m.id }, orderBy: { courier: "asc" } }), prisma.shipmentNotification.findMany({ where: { merchantId: m.id }, orderBy: { createdAt: "desc" }, take: 50, include: { order: { select: { orderNo: true } } } })]);
  const rates = rateRows.map(c => ({ id: c.id, courier: c.courier, baseRate: Number(c.baseRate), baseKg: c.baseKg, extraRate: Number(c.extraRate), extraKg: c.extraKg, codFee: Number(c.codFee), codPercent: c.codPercent, etaDays: c.etaDays, maxKg: c.maxKg, codAllowed: c.codAllowed, pincodePrefixes: c.pincodePrefixes }));
  const notifs = noteRows.map(n => ({ id: n.id, orderNo: n.order.orderNo, event: n.event, channel: n.channel, status: n.status, detail: n.detail, at: n.createdAt.toISOString() }));
  const monthStart = new Date(); monthStart.setUTCDate(1); monthStart.setUTCHours(0, 0, 0, 0);
  const [waUsed, keyRows, actRows] = await Promise.all([prisma.shipmentNotification.count({ where: { merchantId: m.id, channel: "WHATSAPP", status: { not: "FAILED" }, createdAt: { gte: monthStart } } }),
    prisma.sellerApiKey.findMany({ where: { merchantId: m.id, revokedAt: null }, orderBy: { createdAt: "desc" } }), canDo(m.role, "team.manage") ? prisma.sellerAudit.findMany({ where: { merchantId: m.id }, orderBy: { createdAt: "desc" }, take: 50 }) : Promise.resolve([])]);
  const apiKeys = keyRows.map(k => ({ id: k.id, name: k.name, prefix: k.prefix, lastUsedAt: k.lastUsedAt?.toISOString() ?? null, createdAt: k.createdAt.toISOString() }));
  const activity = actRows.map(a => ({ id: a.id, action: a.action, detail: a.detail, at: a.createdAt.toISOString() }));
  const members = memRows.map(t => ({ id: t.id, email: t.email, name: t.name, role: t.role, status: t.status })), invites = invRows.map(i => ({ id: i.id, email: i.email, role: i.role, expiresAt: i.expiresAt.toISOString() }));
  const pickups = pickRows.map(p => ({ id: p.id, name: p.name, contactName: p.contactName, phone: p.phone, addressLine: p.addressLine, city: p.city, state: p.state, pincode: p.pincode, isDefault: p.isDefault }));
  const rows = await prisma.order.findMany({ where: { merchantId: m.id }, orderBy: { createdAt: "desc" }, take: 500 });
  const caseRows = await prisma.ndrCase.findMany({ where: { merchantId: m.id }, orderBy: { createdAt: "desc" }, take: 200, include: { order: true } });
  const cases = caseRows.map(c => ({ id: c.id, orderNo: c.order.orderNo, customerName: c.order.customerName, phone: c.order.phone, carrierCode: c.order.carrierCode, carrierName: c.order.carrierName, courierAction: c.courierAction, trackToken: c.order.trackToken, status: c.status, reason: c.reason, customerChoice: c.customerChoice, customerNote: c.customerNote, createdAt: c.createdAt.toISOString(), repliedAt: c.repliedAt?.toISOString() ?? null }));
  const orders = rows.map(o => ({ id: o.id, orderNo: o.orderNo, customerName: o.customerName, phone: o.phone, pincode: o.pincode, paymentType: o.paymentType, amount: Number(o.amount), awb: o.awb, carrierCode: o.carrierCode, status: o.status, codStatus: o.codStatus, carrierName: o.carrierName, shippedAt: o.shippedAt?.toISOString() ?? null, deliveredAt: o.deliveredAt?.toISOString() ?? null, riskLevel: o.riskLevel, riskReasons: o.riskReasons, createdAt: o.createdAt.toISOString() }));
  return <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6"><SellerApp role={m.role} userName={m.userName} ownerEmail={m.ownerEmail} members={members} invites={invites} pickups={pickups} seats={plans[m.plan].seats} plans={plans} waUsage={{ used: waUsed, limit: Number(process.env.WHATSAPP_MONTHLY_LIMIT) || 500 }} apiKeys={apiKeys} activity={activity} rates={rates} notifs={notifs} mfaEnabled={m.mfaEnabled} userEmail={m.email} codSaved={codSaved} weightSaved={weightSaved} wset={{ divisor: m.weightDivisor, slab: m.weightSlab, tolerance: m.weightTolerance }} waEnabled={waEnabled()} conn={conn} merchantId={m.id} plan={m.plan} planUntil={m.planUntil?.toISOString() ?? null} logoVersion={logo ? +logo.updatedAt : null} justPaid={(await searchParams).paid === "1"} name={m.name} orders={orders} cases={cases} brand={{ brandName: m.brandName ?? "", brandColor: m.brandColor, supportContact: m.supportContact ?? "" }} /></div>;
}
