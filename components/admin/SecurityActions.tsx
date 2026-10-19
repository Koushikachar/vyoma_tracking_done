"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export default function SecurityActions() {
  const r = useRouter(); const [cur, setCur] = useState(""); const [next, setNext] = useState(""); const [msg, setMsg] = useState(""); const [codes, setCodes] = useState<string[]>([]); const [uri, setUri] = useState("");
  async function run(action: string) { setMsg(""); setCodes([]); setUri("");
    const res = await fetch("/api/control/security", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, current: cur, next }) }); const j = await res.json();
    if (!j.success) return setMsg(j.error?.message ?? "Failed."); setMsg("Done."); setCodes(j.codes ?? []); setUri(j.otpauth ?? ""); setCur(""); setNext(""); r.refresh(); }
  const i = "rounded-xl border border-line bg-transparent px-3 py-2 text-sm"; const b = "rounded-xl border border-line px-3 py-2 text-sm";
  return (<section className="space-y-3"><h2 className="font-semibold">Account protection</h2>
    <div className="flex flex-wrap gap-2"><input type="password" autoComplete="current-password" placeholder="Current password" value={cur} onChange={e => setCur(e.target.value)} className={i} />
      <input type="password" autoComplete="new-password" placeholder="New password (12+ chars)" value={next} onChange={e => setNext(e.target.value)} className={i} /></div>
    <div className="flex flex-wrap gap-2"><button className={b} disabled={!cur || next.length < 12} onClick={() => run("change-password")}>Change password</button>
      <button className={b} disabled={!cur} onClick={() => run("regenerate-recovery")}>Regenerate recovery codes</button>
      <button className={b} disabled={!cur} onClick={() => run("reset-2fa")}>Reset 2FA</button></div>
    {msg && <p role="status" className="text-sm">{msg}</p>}
    {uri && <p className="text-xs break-all">Add to your authenticator app now (shown once): <code>{uri}</code></p>}
    {codes.length > 0 && <div className="rounded-xl border border-brand p-4"><p className="text-sm mb-2">Save these recovery codes now. Each works once and they won’t be shown again.</p><div className="font-mono text-sm grid grid-cols-2 gap-1">{codes.map(c => <span key={c}>{c}</span>)}</div></div>}</section>);
}
