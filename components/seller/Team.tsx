"use client";
import { fmtDate } from "@/lib/format";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { assignable, canDo, ROLE_LABEL, type Role } from "@/lib/seller/roles";
import type { View } from "@/components/seller/Intelligence";
type Member = { id: string; email: string; name: string; role: string; status: string };
type Invite = { id: string; email: string; role: string; expiresAt: string };
type Pickup = { id: string; name: string; contactName: string | null; phone: string | null; addressLine: string; city: string; state: string; pincode: string; isDefault: boolean };
const card = "rounded-2xl border border-line bg-card/70 p-4 backdrop-blur sm:p-5";
const inp = "h-11 w-full min-w-0 rounded-xl border border-line bg-card px-3 text-sm text-fg outline-none placeholder:text-muted focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/30";
const ALL = ["ADMIN", "OPERATIONS", "FINANCE", "VIEWER"];

export function SetupChecklist({ steps, go }: { steps: { label: string; done: boolean; view: View }[]; go: (v: View) => void }) {
  const left = steps.filter(s => !s.done).length; if (!left) return null;
  return (<section className="rounded-2xl border border-brand/40 bg-brand/5 p-4 sm:p-5" aria-label="Finish setting up"><h2 className="font-semibold">Finish setting up <span className="text-sm font-normal text-muted">({steps.length - left} of {steps.length} done)</span></h2>
    <ul className="mt-3 space-y-2">{steps.map(s => <li key={s.label} className="flex items-center justify-between gap-3 text-sm"><span className="flex items-center gap-2"><span className={`grid h-5 w-5 place-items-center rounded-full border text-xs ${s.done ? "border-emerald-500 bg-emerald-500 text-white" : "border-line"}`} aria-hidden>{s.done ? "✓" : ""}</span><span className={s.done ? "text-muted line-through" : ""}>{s.label}</span></span>{!s.done && <button onClick={() => go(s.view)} className="shrink-0 text-sm font-medium text-brand">Open</button>}</li>)}</ul></section>);
}

export default function Team({ role, ownerEmail, members, invites, pickups, seats }: { role: Role; ownerEmail: string; members: Member[]; invites: Invite[]; pickups: Pickup[]; seats: number }) {
  const r = useRouter(); const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null); const [busy, setBusy] = useState(false);
  const [inv, setInv] = useState({ email: "", role: "OPERATIONS" }); const [pk, setPk] = useState({ name: "", contactName: "", phone: "", addressLine: "", city: "", state: "", pincode: "", makeDefault: false });
  const manage = canDo(role, "team.manage"), editPickups = canDo(role, "orders.write"); const roles = ALL.filter(x => assignable(role, x)); const used = 1 + members.length + invites.length;
  const call = async (body: object, ok: string, after?: () => void) => { setBusy(true); setMsg(null);
    try { const res = await fetch("/api/seller/team", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }); const j = await res.json(); if (j.success) { setMsg({ ok: true, t: ok }); after?.(); r.refresh(); } else setMsg({ ok: false, t: j.error?.message ?? "Failed." }); }
    catch { setMsg({ ok: false, t: "Network error. Please try again." }); } finally { setBusy(false); } };
  const btn = "h-10 rounded-xl px-3.5 text-sm font-medium transition disabled:opacity-50";
  return (<section className="space-y-5" aria-label="Team and setup">
    {msg && <p role="status" className={`rounded-xl border px-4 py-2.5 text-sm ${msg.ok ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400" : "border-red-500/40 text-red-500"}`}>{msg.t}</p>}
    <div className={card}><h2 className="font-semibold">Team <span className="text-sm font-normal text-muted">({used} of {seats} seat{seats === 1 ? "" : "s"} used)</span></h2>
      <ul className="mt-3 divide-y divide-line text-sm"><li className="flex flex-wrap items-center justify-between gap-2 py-2.5"><span className="min-w-0 break-all">{ownerEmail}</span><span className="rounded-full bg-brand/15 px-2.5 py-0.5 text-xs text-brand">Owner</span></li>
        {members.map(m => <li key={m.id} className="flex flex-col gap-2 py-2.5 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="break-all">{m.email}</div><div className="text-xs text-muted">{m.name}</div></div>
          <div className="flex items-center gap-2">{manage && assignable(role, m.role) ? <><select aria-label={`Role for ${m.email}`} disabled={busy} value={m.role} onChange={e => call({ action: "set-role", id: m.id, role: e.target.value }, "Role updated.")} className="field h-10 rounded-xl border border-line bg-card px-3 text-sm">{roles.map(x => <option key={x} value={x}>{ROLE_LABEL[x]}</option>)}</select>
            <button disabled={busy} title="Use if they lost their phone" onClick={() => confirm(`Reset two-step sign-in for ${m.email}?`) && call({ action: "reset-mfa", id: m.id }, "Two-step sign-in reset.")} className={`${btn} border border-line`}>Reset 2-step</button>
            <button disabled={busy} onClick={() => confirm(`Remove ${m.email}? They lose access immediately.`) && call({ action: "remove", id: m.id }, "Team member removed.")} className={`${btn} text-red-500 hover:bg-red-500/10`}>Remove</button></> : <span className="rounded-full bg-line px-2.5 py-0.5 text-xs text-muted">{ROLE_LABEL[m.role] ?? m.role}</span>}</div></li>)}
        {invites.map(i => <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5"><span className="min-w-0 break-all">{i.email} <span className="text-xs text-muted">· invited as {ROLE_LABEL[i.role]?.toLowerCase()}, expires {fmtDate(i.expiresAt)}</span></span>{manage && <button disabled={busy} onClick={() => call({ action: "revoke-invite", id: i.id }, "Invitation cancelled.")} className={`${btn} border border-line`}>Cancel</button>}</li>)}</ul>
      {manage && (used >= seats ? <p className="mt-3 text-sm text-muted">All seats are used. Upgrade your plan to invite more people.</p> :
        <form onSubmit={e => { e.preventDefault(); call({ action: "invite", ...inv }, "Invitation sent.", () => setInv({ ...inv, email: "" })); }} className="mt-4 flex flex-col gap-3 border-t border-line pt-4 sm:flex-row"><input className={inp} type="email" required placeholder="Teammate's email" aria-label="Teammate's email" value={inv.email} onChange={e => setInv({ ...inv, email: e.target.value })} />
          <select aria-label="Role" className={`field ${inp} sm:w-44`} value={inv.role} onChange={e => setInv({ ...inv, role: e.target.value })}>{roles.map(x => <option key={x} value={x}>{ROLE_LABEL[x]}</option>)}</select><button disabled={busy} className={`${btn} h-11 bg-brand px-5 font-semibold text-bg hover:opacity-90`}>Send invite</button></form>)}
      <p className="mt-3 text-xs text-muted">Admin: everything except billing. Operations: orders and NDR. Finance: COD and weight records. Read-only: view only.</p></div>

    <div className={card}><h2 className="font-semibold">Pickup locations</h2>
      {!pickups.length ? <p className="mt-2 text-sm text-muted">No pickup location yet. Add the address your parcels are collected from.</p> : <ul className="mt-3 divide-y divide-line text-sm">{pickups.map(p => <li key={p.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><div className="font-medium">{p.name}{p.isDefault && <span className="ml-2 rounded-full bg-brand/15 px-2 py-0.5 text-xs font-normal text-brand">Default</span>}</div><div className="break-words text-muted">{p.addressLine}, {p.city}, {p.state} {p.pincode}</div><div className="text-xs text-muted">{[p.contactName, p.phone].filter(Boolean).join(" · ")}</div></div>
        {editPickups && <div className="flex shrink-0 gap-2">{!p.isDefault && <button disabled={busy} onClick={() => call({ action: "pickup-save", id: p.id, name: p.name, contactName: p.contactName ?? undefined, phone: p.phone ?? undefined, addressLine: p.addressLine, city: p.city, state: p.state, pincode: p.pincode, makeDefault: true }, "Default location updated.")} className={`${btn} border border-line`}>Make default</button>}<button disabled={busy} onClick={() => confirm(`Delete ${p.name}?`) && call({ action: "pickup-delete", id: p.id }, "Location deleted.")} className={`${btn} text-red-500 hover:bg-red-500/10`}>Delete</button></div>}</li>)}</ul>}
      {editPickups && <form onSubmit={e => { e.preventDefault(); call({ action: "pickup-save", ...pk }, "Pickup location saved.", () => setPk({ name: "", contactName: "", phone: "", addressLine: "", city: "", state: "", pincode: "", makeDefault: false })); }} className="mt-4 grid gap-3 border-t border-line pt-4 sm:grid-cols-2">
        <input className={inp} required minLength={2} placeholder="Location name (e.g. Main warehouse)" value={pk.name} onChange={e => setPk({ ...pk, name: e.target.value })} aria-label="Location name" /><input className={inp} placeholder="Contact person" value={pk.contactName} onChange={e => setPk({ ...pk, contactName: e.target.value })} aria-label="Contact person" />
        <input className={inp} placeholder="Phone" inputMode="tel" value={pk.phone} onChange={e => setPk({ ...pk, phone: e.target.value })} aria-label="Phone" /><input className={inp} required placeholder="Pincode" inputMode="numeric" maxLength={6} pattern="[1-9][0-9]{5}" value={pk.pincode} onChange={e => setPk({ ...pk, pincode: e.target.value })} aria-label="Pincode" />
        <input className={`${inp} sm:col-span-2`} required minLength={5} placeholder="Address" value={pk.addressLine} onChange={e => setPk({ ...pk, addressLine: e.target.value })} aria-label="Address" />
        <input className={inp} required placeholder="City" value={pk.city} onChange={e => setPk({ ...pk, city: e.target.value })} aria-label="City" /><input className={inp} required placeholder="State" value={pk.state} onChange={e => setPk({ ...pk, state: e.target.value })} aria-label="State" />
        <label className="flex items-center gap-2 text-sm text-muted"><input type="checkbox" checked={pk.makeDefault} onChange={e => setPk({ ...pk, makeDefault: e.target.checked })} />Make this the default</label><button disabled={busy} className={`${btn} h-11 bg-brand px-5 font-semibold text-bg hover:opacity-90`}>Save location</button></form>}</div>
  </section>);
}
