"use client";
import { useState } from "react";
const OPTS = [["REATTEMPT", "Please try delivering again", "Keep my address and phone as they are."], ["UPDATE_ADDRESS", "My address needs a correction", "Tell us the full correct address."], ["CANCEL", "Cancel my order", "I no longer want this delivery."]] as const;
export default function NdrReply({ token, current }: { token: string; current?: string | null }) {
  const [c, setC] = useState<string>(current ?? ""); const [note, setNote] = useState(""); const [busy, setBusy] = useState(false); const [err, setErr] = useState(""); const [done, setDone] = useState(false);
  const send = async () => { setBusy(true); setErr("");
    try { const r = await fetch("/api/public/ndr", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token, choice: c, note }) }); const j = await r.json(); if (j.success) setDone(true); else setErr(j.error?.message ?? "Something went wrong."); }
    catch { setErr("Network error. Please try again."); } finally { setBusy(false); } };
  if (done) return <div role="status" className="rounded-3xl border border-emerald-500/40 bg-emerald-500/10 p-6 text-center"><div className="text-lg font-semibold">Thank you! ✓</div><p className="mt-1 text-sm text-muted">We have sent your reply to the seller. They will arrange the next step.</p></div>;
  return (<section className="rounded-3xl border border-amber-500/40 bg-amber-500/5 p-5 sm:p-6" aria-label="Delivery help">
    <h2 className="text-lg font-semibold">We could not deliver your parcel</h2><p className="mt-1 text-sm text-muted">Tell us what to do next and the seller will take care of it.</p>
    <div className="mt-4 space-y-2" role="radiogroup">{OPTS.map(([k, t, d]) => <button key={k} type="button" role="radio" aria-checked={c === k} onClick={() => setC(k)} className={`w-full rounded-2xl border p-4 text-left transition ${c === k ? "border-brand bg-brand/10" : "border-line bg-card/70 hover:border-brand/50"}`}><div className="font-medium">{t}</div><div className="text-xs text-muted">{d}</div></button>)}</div>
    {(c === "UPDATE_ADDRESS" || c === "REATTEMPT") && <textarea value={note} onChange={e => setNote(e.target.value)} maxLength={300} rows={3} placeholder={c === "UPDATE_ADDRESS" ? "Full corrected address with pincode" : "Anything we should know? (optional, e.g. best time to call)"} className="mt-3 w-full rounded-2xl border border-line bg-card p-3 text-sm text-fg outline-none placeholder:text-muted focus-visible:border-brand" />}
    {err && <p role="alert" className="mt-3 text-sm text-red-500">{err}</p>}
    <button disabled={!c || busy} onClick={send} className="mt-4 h-12 w-full rounded-xl bg-brand font-semibold text-bg transition-opacity hover:opacity-90 disabled:opacity-40">{busy ? "Sending…" : "Send my reply"}</button>
  </section>);
}
