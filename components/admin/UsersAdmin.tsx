"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, UserPlus } from "lucide-react";
const ROLES = ["SUPER_ADMIN", "ADMIN", "SUPPORT", "ANALYST"];
const INFO: [string, string][] = [
  ["SUPER_ADMIN", "Everything, including Users and Security."],
  ["ADMIN", "Shipments, sellers, carriers, API keys, webhooks, logs, settings, messages. No Users page."],
  ["SUPPORT", "Shipments and contact messages only."],
  ["ANALYST", "Read-only analytics and shipments."],
];
const card = "rounded-3xl border border-line bg-card/80 p-5 sm:p-6 shadow-sm backdrop-blur";
const inp = "h-11 w-full rounded-xl border border-line bg-card/60 px-4 text-sm outline-none transition focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/30 disabled:opacity-60";

export default function UsersAdmin({ users, selfId }: { users: { id: string; email: string; role: string }[]; selfId: string }) {
  const r = useRouter(); const [pw, setPw] = useState(""); const [email, setEmail] = useState(""); const [role, setRole] = useState("SUPPORT");
  const [msg, setMsg] = useState(""); const [made, setMade] = useState<any>(null); const [busy, setBusy] = useState(false);
  const call = async (b: object) => {
    setMsg(""); setBusy(true);
    try { const res = await fetch("/api/control/users", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ current: pw, ...b }) }); const j = await res.json();
      if (!j.success) { setMsg(j.error?.message ?? "Failed."); return; } r.refresh(); return j; }
    catch { setMsg("Network error. Please try again."); } finally { setBusy(false); }
  };
  const locked = !pw || busy;
  return (<div className="space-y-5">
    <section className={card}>
      <h2 className="flex items-center gap-2 font-semibold"><Lock size={17} className="text-brand" />Confirm with your password</h2>
      <p className="mt-1 text-xs text-muted">Required for every change below. Nothing is saved without it.</p>
      <input type="password" autoComplete="current-password" placeholder="Your password" aria-label="Your password" value={pw} onChange={e => setPw(e.target.value)} className={`${inp} mt-4 sm:max-w-sm`} />
    </section>

    <section className={card}>
      <h2 className="font-semibold">Admins <span className="text-sm font-normal text-muted">({users.length})</span></h2>
      <ul className="mt-4 divide-y divide-line">{users.map(u => (
        <li key={u.id} className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 break-all text-sm font-medium">{u.email}{u.id === selfId && <span className="ml-2 rounded-full bg-brand/15 px-2 py-0.5 align-middle text-xs font-normal text-brand">you</span>}</div>
          <div className="flex items-center gap-3">
            <select key={u.id + u.role} aria-label={`Role for ${u.email}`} disabled={u.id === selfId || locked} defaultValue={u.role} onChange={e => call({ action: "set-role", id: u.id, role: e.target.value })} className={`field ${inp} min-w-0 flex-1 sm:w-52 sm:flex-none`}>
              {ROLES.map(x => <option key={x} value={x}>{x}</option>)}</select>
            {u.id !== selfId && <button type="button" disabled={locked} onClick={() => confirm(`Delete ${u.email}?`) && call({ action: "delete", id: u.id })} className="shrink-0 rounded-xl px-3 py-2 text-sm font-medium text-red-500 transition hover:bg-red-500/10 disabled:opacity-40">Delete</button>}
          </div></li>))}</ul>
    </section>

    <section className={card}>
      <h2 className="flex items-center gap-2 font-semibold"><UserPlus size={17} className="text-brand" />Add admin</h2>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <input type="email" placeholder="Email" aria-label="New admin email" autoComplete="off" value={email} onChange={e => setEmail(e.target.value)} className={`${inp} min-w-0 sm:flex-1`} />
        <select aria-label="Role" value={role} onChange={e => setRole(e.target.value)} className={`field ${inp} sm:w-44 sm:shrink-0`}>{ROLES.map(x => <option key={x} value={x}>{x}</option>)}</select>
        <button type="button" disabled={locked || !email} onClick={async () => { const j = await call({ action: "create", email, role }); if (j) { setMade(j); setEmail(""); } }}
          className="h-11 w-full shrink-0 rounded-xl bg-brand px-6 text-sm font-semibold text-bg transition hover:opacity-90 disabled:opacity-40 sm:w-auto">{busy ? "Working…" : "Create"}</button>
      </div>
      {!pw && <p className="mt-3 text-xs text-muted">Enter your password above to enable these buttons.</p>}
      {msg && <p role="alert" className="mt-3 text-sm text-red-500">{msg}</p>}
      {made && <div className="mt-4 space-y-2 rounded-2xl border border-brand/40 bg-brand/5 p-4 text-sm">
        <p>Shown once. Hand these over securely; the new admin should change the password on first login.</p>
        <p>Email: {made.email}<br />Temporary password: <code className="break-all">{made.password}</code></p>
        <p className="break-all">Authenticator link: <code>{made.otpauth}</code></p>
        <p className="break-words font-mono">{made.codes.join("  ")}</p></div>}
    </section>

    <section className={card}>
      <h2 className="font-semibold">What each role can do</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">{INFO.map(([n, d]) => (
        <div key={n} className="rounded-2xl border border-line p-4"><div className="text-xs font-semibold tracking-wide text-brand">{n}</div><p className="mt-1.5 text-sm text-muted">{d}</p></div>))}</div>
    </section>
  </div>);
}
