"use client";
import { useState } from "react";
import { useParams } from "next/navigation";
export default function AdminLogin() {
  const { route } = useParams<{ route: string }>();
  const [step, setStep] = useState<"password" | "totp">("password");
  const [f, setF] = useState({ email: "", password: "", code: "" }); const [pending, setPending] = useState(""); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr("");
    const body = step === "password" ? { step, email: f.email, password: f.password } : { step, pending, code: f.code };
    const res = await fetch("/api/control/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }); const j = await res.json(); setBusy(false);
    if (!j.success) return setErr(j.error?.message ?? "Login failed.");
    if (j.mfa) { setPending(j.pending); setStep("totp"); } else window.location.assign(`/control/${route}/dashboard`); // full load: layout re-reads the session, so the sidebar shows at once
  }
  const inp = "w-full rounded-lg border border-line bg-transparent px-3 py-3";
  return (<div className="mx-auto max-w-sm px-6 py-24"><h1 className="text-3xl font-bold mb-6">VYOMA ROUTE</h1><p className="text-muted text-sm mb-6">Operations sign in</p>
    <form onSubmit={submit} className="space-y-4">
      {step === "password" ? (<><input className={inp} type="email" autoComplete="username" placeholder="Email" required value={f.email} onChange={e => setF({ ...f, email: e.target.value })} />
        <input className={inp} type="password" autoComplete="current-password" placeholder="Password" required value={f.password} onChange={e => setF({ ...f, password: e.target.value })} /></>)
        : <input className={inp} inputMode="numeric" autoComplete="one-time-code" maxLength={16} placeholder="6-digit code or recovery code" required value={f.code} onChange={e => setF({ ...f, code: e.target.value })} />}
      {err && <p role="alert" className="text-sm text-red-500">{err}</p>}
      <button disabled={busy} className="w-full rounded-lg bg-brand text-bg font-semibold py-3 disabled:opacity-60">{busy ? "Checking…" : step === "password" ? "Continue" : "Verify"}</button></form></div>);
}
