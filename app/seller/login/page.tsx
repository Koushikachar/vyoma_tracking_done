"use client";
import { useState } from "react";
import Link from "next/link";
export default function SellerLogin() {
  const [reg, setReg] = useState(false); const [need, setNeed] = useState(false); const [code, setCode] = useState(""); const [f, setF] = useState({ name: "", email: "", password: "" }); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => { e.preventDefault(); setBusy(true); setErr("");
    try { const r = await fetch("/api/seller/auth", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mode: reg ? "register" : "login", ...f, ...(need ? { code } : {}) }) }); const j = await r.json();
      if (!j.success) { if (j.mfaRequired && !need) { setNeed(true); setErr(""); return; } return setErr(j.error?.message ?? "Something went wrong."); } window.location.assign("/seller"); }
    catch { setErr("Network error. Please try again."); } finally { setBusy(false); } };
  const inp = "h-12 w-full rounded-xl border border-line bg-card px-4 text-sm text-fg outline-none placeholder:text-muted focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/30";
  return (<main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12">
    <form onSubmit={submit} className="space-y-4 rounded-3xl border border-line bg-card/80 p-6 shadow-sm backdrop-blur sm:p-8">
      <div><h1 className="text-2xl font-bold">{reg ? "Create your seller account" : "Seller sign in"}</h1><p className="mt-1 text-sm text-muted">Track every order and shipment from one place.</p></div>
      {reg && <input className={inp} placeholder="Business name" autoComplete="organization" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} required />}
      <input className={inp} type="email" placeholder="Email" autoComplete="email" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} required />
      <input className={inp} type="password" placeholder={reg ? "Password (10+ characters)" : "Password"} autoComplete={reg ? "new-password" : "current-password"} value={f.password} onChange={e => setF({ ...f, password: e.target.value })} required minLength={reg ? 10 : 1} />
      {need && !reg && <input className={inp} inputMode="text" autoComplete="one-time-code" placeholder="6-digit code or recovery code" aria-label="Authentication code" autoFocus value={code} onChange={e => setCode(e.target.value)} required />}
      {err && <p role="alert" className="text-sm text-red-500">{err}</p>}
      <button disabled={busy} className="h-12 w-full rounded-xl bg-brand font-semibold text-bg transition-opacity hover:opacity-90 disabled:opacity-50">{busy ? "Please wait…" : reg ? "Create account" : "Sign in"}</button>
      {!reg && <p className="text-center text-sm"><Link href="/seller/forgot" className="font-medium text-brand">Forgot your password?</Link></p>}
      <p className="text-center text-sm text-muted">{reg ? "Already have an account?" : "New seller?"} <button type="button" onClick={() => { setReg(!reg); setErr(""); }} className="font-medium text-brand">{reg ? "Sign in" : "Create an account"}</button></p>
      <p className="text-center text-xs text-muted"><Link href="/">← Back to tracking</Link></p>
    </form></main>);
}
