"use client";
import { useState } from "react";
import Link from "next/link";
export default function JoinForm({ token }: { token?: string }) {
  const [name, setName] = useState(""); const [pw, setPw] = useState(""); const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const submit = async (e: React.FormEvent) => { e.preventDefault(); setBusy(true); setErr("");
    try { const r = await fetch("/api/seller/auth", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mode: "join", token, name, password: pw }) }); const j = await r.json(); if (j.success) window.location.assign("/seller"); else setErr(j.error?.message ?? "Something went wrong."); }
    catch { setErr("Network error. Please try again."); } finally { setBusy(false); } };
  const inp = "h-12 w-full rounded-xl border border-line bg-card px-4 text-sm text-fg outline-none placeholder:text-muted focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/30";
  return (<main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12"><form onSubmit={submit} className="space-y-4 rounded-3xl border border-line bg-card/80 p-6 shadow-sm backdrop-blur sm:p-8">
    <h1 className="text-2xl font-bold">Join the team</h1>
    {!token ? <p role="alert" className="text-sm text-red-500">This link is incomplete. Please open it again from your email.</p> : <>
      <p className="text-sm text-muted">Choose your name and a password (10+ characters) to join the workspace.</p>
      <input className={inp} placeholder="Your name" autoComplete="name" required minLength={2} value={name} onChange={e => setName(e.target.value)} />
      <input className={inp} type="password" placeholder="Password (10+ characters)" autoComplete="new-password" required minLength={10} value={pw} onChange={e => setPw(e.target.value)} />
      {err && <p role="alert" className="text-sm text-red-500">{err}</p>}
      <button disabled={busy} className="h-12 w-full rounded-xl bg-brand font-semibold text-bg transition-opacity hover:opacity-90 disabled:opacity-50">{busy ? "Please wait…" : "Join workspace"}</button></>}
    <p className="text-center text-sm"><Link href="/seller/login" className="font-medium text-brand">Back to sign in</Link></p></form></main>);
}
