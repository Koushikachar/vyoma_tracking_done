"use client";
import { fmtDate } from "@/lib/format";
import { useState } from "react";
import { planFeatures, type Plan } from "@/lib/seller/plans";
type Info = { label: string; price: number; orders: number; seats: number };
export default function Plans({ plan, until, justPaid, plans }: { plan: Plan; until: string | null; justPaid: boolean; plans: Record<Plan, Info> }) {
  const [busy, setBusy] = useState<string | null>(null); const [err, setErr] = useState("");
  const buy = async (p: string) => { setBusy(p); setErr("");
    try { const r = await fetch("/api/seller/billing", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ plan: p }) }); const j = await r.json(); if (j.success) window.location.assign(j.url); else setErr(j.error?.message ?? "Something went wrong."); }
    catch { setErr("Network error. Please try again."); } finally { setBusy(null); } };
  return (<section className="space-y-5" aria-label="Plan and billing">
    {justPaid && <p role="status" className="rounded-xl border border-emerald-500/40 px-4 py-2.5 text-sm text-emerald-600 dark:text-emerald-400">Thank you! Your payment is being confirmed. Your plan updates within a minute, so refresh this page if it still shows the old plan.</p>}
    <p className="text-sm text-muted">You are on the <b className="text-fg">{plans[plan].label}</b> plan{plan !== "FREE" && until ? <> until <b className="text-fg">{fmtDate(until)}</b></> : ""}. Each payment buys 30 days. There are no automatic charges, so renew whenever you like.</p>
    <div className="grid gap-4 md:grid-cols-3">{(Object.keys(plans) as Plan[]).map(k => { const cur = k === plan; return (
      <div key={k} className={`flex flex-col rounded-3xl border p-5 backdrop-blur sm:p-6 ${cur ? "border-brand bg-brand/5" : "border-line bg-card/70"}`}>
        <div className="flex items-center justify-between"><h2 className="text-lg font-semibold">{plans[k].label}</h2>{cur && <span className="rounded-full bg-brand/15 px-2.5 py-0.5 text-xs text-brand">Current</span>}</div>
        <div className="mt-2 text-3xl font-bold">₹{plans[k].price.toLocaleString("en-IN")}<span className="text-sm font-normal text-muted"> / 30 days</span></div>
        <ul className="mt-4 flex-1 space-y-2 text-sm">{planFeatures(k, plans[k]).map(f => <li key={f} className="flex gap-2"><span className="text-emerald-500" aria-hidden>✓</span>{f}</li>)}</ul>
        {k !== "FREE" && <button disabled={!!busy} onClick={() => buy(k)} className="mt-5 h-11 rounded-xl bg-brand font-semibold text-bg transition-opacity hover:opacity-90 disabled:opacity-50">{busy === k ? "Opening payment…" : cur ? "Renew for 30 days" : `Choose ${plans[k].label}`}</button>}
      </div>); })}</div>
    {err && <p role="alert" className="text-sm text-red-500">{err}</p>}
    <p className="text-xs text-muted">Only the workspace owner can pay. Payments are processed by Razorpay. If a plan expires, your data stays safe and the account returns to Free limits.</p>
  </section>);
}
