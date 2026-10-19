"use client";
import { useState } from "react";
export default function VerifyGate({ email }: { email: string }) {
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null); const [busy, setBusy] = useState(false);
  const call = async (mode: string) => { setBusy(true); setMsg(null); try { const r = await fetch("/api/seller/auth", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mode }) }); const j = await r.json();
    if (mode === "logout") return window.location.assign("/seller/login"); setMsg(j.success ? { ok: true, t: "Email sent. Check your inbox (and spam folder)." } : { ok: false, t: j.error?.message ?? "Failed." }); } catch { setMsg({ ok: false, t: "Network error. Please try again." }); } finally { setBusy(false); } };
  return (<main className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12"><div className="space-y-4 rounded-3xl border border-line bg-card/80 p-6 text-center shadow-sm backdrop-blur sm:p-8">
    <div className="text-4xl" aria-hidden>✉️</div><h1 className="text-2xl font-bold">Confirm your email</h1>
    <p className="text-sm text-muted">We sent a link to <b className="break-all text-fg">{email}</b>. Open it to unlock your seller workspace.</p>
    {msg && <p role="status" className={`text-sm ${msg.ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>{msg.t}</p>}
    <button disabled={busy} onClick={() => call("resend")} className="h-12 w-full rounded-xl bg-brand font-semibold text-bg transition-opacity hover:opacity-90 disabled:opacity-50">{busy ? "Sending…" : "Send the email again"}</button>
    <button onClick={() => call("logout")} className="text-sm text-muted hover:text-fg">Sign out</button></div></main>);
}
