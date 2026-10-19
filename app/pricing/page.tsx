import Link from "next/link";
import type { Metadata } from "next";
import { planFeatures, type Plan } from "@/lib/seller/plans";
import { getPlans } from "@/lib/seller/plans-db";
export const metadata: Metadata = { title: "Pricing", description: "Simple monthly plans for e-commerce sellers." };
export const dynamic = "force-dynamic";
export default async function Pricing() {
  const plans = await getPlans();
  return (<main className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
    <h1 className="text-4xl font-bold sm:text-5xl">Pricing</h1><p className="mt-3 max-w-2xl text-muted">Start free. Pay for 30 days at a time when you need more orders and more tools. There are no automatic charges.</p>
    <div className="mt-10 grid gap-5 md:grid-cols-3">{(Object.keys(plans) as Plan[]).map(k => (<div key={k} className={`flex flex-col rounded-3xl border p-6 ${k === "GROWTH" ? "border-brand bg-brand/5" : "border-line bg-card/70"}`}>
      <h2 className="text-lg font-semibold">{plans[k].label}</h2><div className="mt-2 text-4xl font-bold">₹{plans[k].price.toLocaleString("en-IN")}<span className="text-sm font-normal text-muted"> / 30 days</span></div>
      <ul className="mt-5 flex-1 space-y-2 text-sm">{planFeatures(k, plans[k]).map(f => <li key={f} className="flex gap-2"><span className="text-emerald-500" aria-hidden>✓</span>{f}</li>)}</ul>
      <Link href="/seller/login" className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-brand font-semibold text-bg transition-opacity hover:opacity-90">{k === "FREE" ? "Start free" : `Choose ${plans[k].label}`}</Link></div>))}</div>
    <p className="mt-6 text-sm text-muted">Need custom limits, SLAs or dedicated support? <Link href="/contact" className="font-medium text-brand">Contact us</Link> about Enterprise. Prices may change. WhatsApp message charges, where offered, are billed by the messaging provider and are not included.</p>
  </main>);
}
