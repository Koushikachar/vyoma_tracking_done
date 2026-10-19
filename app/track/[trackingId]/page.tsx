import Link from "next/link";
import { headers } from "next/headers";
import type { Metadata } from "next";
import { track, hashId } from "@/lib/tracking/service";
import { rateLimit } from "@/lib/tracking/rate-limit";
import { saveShipment } from "@/lib/tracking/persist";
import { TrackingError, SAFE_MESSAGES } from "@/lib/carriers/types";
import Timeline from "@/components/timeline/Timeline";
import JourneyView from "@/components/tracking/JourneyView";
export const maxDuration = 30;
export const metadata: Metadata = { title: "Track shipment | VYOMA ROUTE", robots: { index: false } };
export const dynamic = "force-dynamic";
const label = (s: string) => s.replace(/_/g, " ");
const ago = (iso: string) => { const m = Math.round((Date.now() - +new Date(iso)) / 60000); return m < 1 ? "Live update just now" : m < 60 ? `Last updated ${m} minute${m > 1 ? "s" : ""} ago` : `Last updated ${Math.round(m / 60)} hour(s) ago`; };
export default async function TrackPage({ params, searchParams }: { params: Promise<{ trackingId: string }>; searchParams: Promise<{ carrier?: string; refresh?: string }> }) {
  const { trackingId } = await params; const { carrier, refresh } = await searchParams; const id = decodeURIComponent(trackingId);
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  const refreshOk = refresh === "1" && (await rateLimit(`refresh:${ip}:${hashId(id)}`, 3, 300_000)); // same cap as the API
  let data; let code = ""; let why = "";
  try { data = await track(id, carrier, { refresh: refreshOk }); if (data.live) await saveShipment(data.shipment, data.confidence); } catch (e) { code = e instanceof TrackingError ? e.code : "INTERNAL_ERROR"; if (e instanceof TrackingError && e.internal && process.env.NODE_ENV !== "production") why = e.internal; }
  if (!data) return (<div className="mx-auto max-w-xl px-6 py-24 text-center"><h1 className="text-2xl font-semibold">We couldn’t track that shipment</h1>
    <p className="mt-3 text-muted">{SAFE_MESSAGES[code as keyof typeof SAFE_MESSAGES]}</p>{carrier === "delhivery" && code === "SHIPMENT_NOT_FOUND" && <p className="mt-4 text-sm text-muted">Parcels booked outside our account can’t be looked up here. <a className="text-brand underline" href="https://www.delhivery.com/tracking" target="_blank" rel="noopener noreferrer">Track on Delhivery’s own website ↗</a></p>}{why && <p className="mt-3 text-xs text-muted font-mono break-words">Dev detail: {why}</p>}<Link href="/#track" className="inline-block mt-6 rounded-lg bg-brand text-bg px-5 py-2 font-semibold">Try another ID</Link></div>);
  const s = data.shipment; const q = new URLSearchParams({ ...(carrier ? { carrier } : {}), refresh: "1" }).toString();
  const note = refresh === "1" && !refreshOk ? "Too many refreshes. Showing saved data; please wait a few minutes." : undefined;
  return (<div className="mx-auto max-w-4xl px-4 sm:px-6 py-10 sm:py-14">
    <JourneyView s={s} synced={ago(data.meta.lastCarrierSyncAt)} stale={data.meta.stale} refreshHref={`/track/${encodeURIComponent(id)}?${q}`} note={note} />
    <details className="mt-10 text-sm"><summary className="cursor-pointer text-muted">View carrier details</summary><div className="mt-4"><Timeline events={s.events} showRaw /></div></details>
  </div>);
}
