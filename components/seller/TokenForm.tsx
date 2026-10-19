"use client";
import { useState } from "react";
import Link from "next/link";
type Mode = "verify" | "reset" | "forgot";
const COPY = { verify: ["Confirm your email", "Press the button to finish setting up your account.", "Confirm my email", "Your email is confirmed. You can sign in now."], reset: ["Choose a new password", "Use at least 10 characters.", "Save new password", "Your password was changed. Please sign in with the new one."], forgot: ["Forgot your password?", "Enter your account email and we will send you a reset link.", "Send reset link", "If that email has an account, a reset link is on its way. It expires in 1 hour."] } as const;
export default function TokenForm({ mode, token }: { mode: Mode; token?: string }) {
  const [v, setV] = useState(""); const [busy, setBusy] = useState(false); const [err, setErr] = useState(""); const [done, setDone] = useState(false); const [h, intro, btn, ok] = COPY[mode];
  const submit = async (e: React.FormEvent) => { e.preventDefault(); setBusy(true); setErr("");
    try { const body = mode === "forgot" ? { mode, email: v } : mode === "reset" ? { mode, token, password: v } : { mode, token }; const r = await fetch("/api/seller/auth", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }); const j = await r.json(); if (j.success) setDone(true); else setErr(j.error?.message ?? "Something went wrong."); }
    catch { setErr("Network error. Please try again."); } finally { setBusy(false); } };
  const inp = "h-12 w-full rounded-xl border border-line bg-card px-4 text-sm text-fg outline-none placeholder:text-muted focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/30";
  const missing = mode !== "forgot" && !token;
  return (<main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12"><form onSubmit={submit} className="space-y-4 rounded-3xl border border-line bg-card/80 p-6 shadow-sm backdrop-blur sm:p-8">
    <h1 className="text-2xl font-bold">{h}</h1>
    {done ? <p role="status" className="text-sm text-emerald-600 dark:text-emerald-400">{ok}</p> : missing ? <p role="alert" className="text-sm text-red-500">This link is incomplete. Please open it again from your email.</p> : <>
      <p className="text-sm text-muted">{intro}</p>
      {mode === "forgot" && <input className={inp} type="email" placeholder="Email" autoComplete="email" required value={v} onChange={e => setV(e.target.value)} />}
      {mode === "reset" && <input className={inp} type="password" placeholder="New password (10+ characters)" autoComplete="new-password" minLength={10} required value={v} onChange={e => setV(e.target.value)} />}
      {err && <p role="alert" className="text-sm text-red-500">{err}</p>}
      <button disabled={busy} className="h-12 w-full rounded-xl bg-brand font-semibold text-bg transition-opacity hover:opacity-90 disabled:opacity-50">{busy ? "Please wait…" : btn}</button></>}
    <p className="text-center text-sm"><Link href="/seller/login" className="font-medium text-brand">Back to sign in</Link></p></form></main>);
}
