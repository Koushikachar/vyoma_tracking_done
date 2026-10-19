"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
type Info = { label: string; price: number; orders: number; seats: number };
const inp = "h-11 w-full min-w-0 rounded-xl border border-line bg-card/60 px-4 text-sm outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/30";
const card = "rounded-3xl border border-line bg-card/80 p-5 sm:p-6 shadow-sm backdrop-blur";
export default function PlansAdmin({ plans }: { plans: Record<string, Info> }) {
  const r = useRouter(); const [pw, setPw] = useState(""); const [v, setV] = useState(() => Object.fromEntries(Object.entries(plans).map(([k, p]) => [k, { price: String(p.price), orders: String(p.orders), seats: String(p.seats) }])));
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null); const [busy, setBusy] = useState("");
  const save = async (plan: string) => { setBusy(plan); setMsg(null); const x = v[plan];
    try { const res = await fetch("/api/control/plans", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ current: pw, plan, price: Number(x.price), orders: Number(x.orders), seats: Number(x.seats) }) }); const j = await res.json(); setMsg(j.success ? { ok: true, t: `${plans[plan].label} plan saved.` } : { ok: false, t: j.error?.message ?? "Failed." }); if (j.success) r.refresh(); }
    catch { setMsg({ ok: false, t: "Network error. Please try again." }); } finally { setBusy(""); } };
  return (<div className="space-y-5"><section className={card}><h2 className="flex items-center gap-2 font-semibold"><Lock size={17} className="text-brand" />Confirm with your password</h2><p className="mt-1 text-xs text-muted">Required for every change. Each change is written to the audit log.</p><input type="password" autoComplete="current-password" placeholder="Your password" aria-label="Your password" value={pw} onChange={e => setPw(e.target.value)} className={`${inp} mt-4 sm:max-w-sm`} /></section>
    {msg && <p role="status" className={`rounded-xl border px-4 py-2.5 text-sm ${msg.ok ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400" : "border-red-500/40 text-red-500"}`}>{msg.t}</p>}
    <div className="grid gap-4 md:grid-cols-3">{Object.entries(plans).map(([k, p]) => <section key={k} className={card}><h2 className="text-lg font-semibold">{p.label}</h2>
      <div className="mt-3 space-y-3">{([["price", "Price (₹ per 30 days)"], ["orders", "Order limit"], ["seats", "Team seats"]] as const).map(([f, l]) => <label key={f} className="block text-xs text-muted">{l}<input className={`${inp} mt-1`} inputMode="numeric" disabled={k === "FREE" && f === "price"} value={v[k][f]} onChange={e => setV({ ...v, [k]: { ...v[k], [f]: e.target.value.replace(/\D/g, "") } })} /></label>)}</div>
      <button disabled={!pw || !!busy} onClick={() => save(k)} className="mt-4 h-11 w-full rounded-xl bg-brand font-semibold text-bg hover:opacity-90 disabled:opacity-40">{busy === k ? "Saving…" : "Save"}</button></section>)}</div>
    <p className="text-xs text-muted">The Free plan always costs ₹0. A payment already started keeps the price it began with. Sellers who already paid keep their plan until it ends.</p></div>);
}
