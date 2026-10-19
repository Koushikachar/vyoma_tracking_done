import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db/prisma";
import { rateLimit } from "@/lib/tracking/rate-limit";
import { track } from "@/lib/tracking/service";
import JourneyView from "@/components/tracking/JourneyView";
import NdrReply from "@/components/tracking/NdrReply";
export const dynamic = "force-dynamic"; export const maxDuration = 30;
export const metadata: Metadata = { title: "Track your order", robots: { index: false, follow: false } };
const rgb = (h: string) => /^#[0-9a-f]{6}$/i.test(h) ? [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)).join(" ") : "79 70 229";
const contactLink = (c: string) => /^https?:\/\//.test(c) ? c : c.includes("@") ? `mailto:${c}` : /^[+\d\s-]{8,}$/.test(c) ? `tel:${c.replace(/[\s-]/g, "")}` : null;
export default async function CustomerTrack({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params; const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!(await rateLimit(`pub-track:${ip}`, 40, 60_000))) return <main className="mx-auto max-w-md px-4 py-20 text-center text-muted">Too many requests. Please try again in a minute.</main>;
  if (!/^[A-Za-z0-9_-]{10,64}$/.test(token)) notFound();
  const o = await prisma.order.findUnique({ where: { trackToken: token }, include: { merchant: true, ndrCases: { where: { status: { not: "RESOLVED" } }, take: 1 } } }); if (!o) notFound();
  const logo = await prisma.merchantLogo.findUnique({ where: { merchantId: o.merchantId }, select: { updatedAt: true } });
  const brand = o.merchant.brandName || o.merchant.name; const help = o.merchant.supportContact; const href = help ? contactLink(help) : null;
  let data: Awaited<ReturnType<typeof track>> | null = null; if (o.awb) { try { data = await track(o.awb, o.carrierCode ?? undefined); } catch {} }
  const ndr = o.ndrCases[0]; const synced = data ? `Updated ${new Date(data.meta.lastCarrierSyncAt).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" })}` : "";
  return (<div style={{ ["--brand" as any]: rgb(o.merchant.brandColor) }} className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6 sm:py-12">
    <header className="flex items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-3">{logo ? <img src={`/api/public/logo/${o.merchantId}?v=${+logo.updatedAt}`} alt="" className="h-11 w-11 shrink-0 rounded-2xl border border-line bg-white object-contain" /> : <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand text-lg font-bold text-bg">{brand[0]?.toUpperCase()}</span>}<div className="min-w-0"><div className="truncate font-semibold">{brand}</div><div className="truncate text-xs text-muted">Order {o.orderNo}</div></div></div>
      {help && <a href={href ?? undefined} className="shrink-0 rounded-xl border border-line px-3 py-2 text-sm font-medium transition hover:border-brand">Need help?</a>}</header>
    {ndr && <NdrReply token={token} current={ndr.customerChoice} />}
    {data ? <JourneyView s={data.shipment} synced={synced} stale={data.meta.stale} refreshHref={`/t/${token}`} />
      : <div className="rounded-3xl border border-line bg-card/70 p-8 text-center"><h1 className="text-2xl font-bold">{o.awb ? "Tracking update isn't available yet" : "Your order is being prepared"}</h1><p className="mt-2 text-sm text-muted">{o.awb ? "Please check again in a little while." : `${brand} has not shipped this order yet. This page will show live updates once it ships.`}</p></div>}
    <footer className="pt-4 text-center text-xs text-muted">{help && !href ? <p className="mb-1">Support: {help}</p> : null}Tracking by Vyoma Route</footer>
  </div>);
}
