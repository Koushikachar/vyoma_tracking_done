"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
type Msg = { ok: boolean; text: string } | null;
export default function KeyForm({ carrierCode, hasKey }: { carrierCode: string; hasKey: boolean }) {
  const r = useRouter(); const [t, setT] = useState(""); const [msg, setMsg] = useState<Msg>(null); const [busy, setBusy] = useState(false);
  const call = async (method: "POST" | "DELETE" | "PUT", body: object, done: string) => {
    setBusy(true); setMsg(null);
    try { const res = await fetch("/api/control/credentials", { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) }); const j = await res.json().catch(() => ({}));
      if (!res.ok) { setMsg({ ok: false, text: j?.error?.message ?? j?.message ?? "Failed. Please try again." }); return; }
      setT(""); setMsg({ ok: j?.ok !== false, text: method === "PUT" ? (j.message ?? done) : done }); if (method !== "PUT") r.refresh(); // refresh updates the "Configured" badge in place
    } catch { setMsg({ ok: false, text: "Network error. Please try again." }); } finally { setBusy(false); }
  };
  const btn = "rounded-xl px-3 py-2 text-sm transition disabled:opacity-50";
  return (<div className="mt-3 space-y-2">
    <div className="flex flex-wrap items-center gap-2">
      <input type="password" autoComplete="off" value={t} onChange={e => setT(e.target.value)} placeholder={hasKey ? "•••••••••••••••• (key saved)" : "API token or ID:SECRET"} aria-label="API key"
        className="min-w-0 flex-1 rounded-xl border border-line bg-transparent px-3 py-2 text-sm placeholder:text-muted" />
      <button disabled={busy || t.trim().length < 8} onClick={() => call("POST", { carrierCode, token: t.trim() }, "Key saved. This carrier is now connected.")} className={`${btn} bg-brand text-bg`}>{hasKey ? "Update" : "Save"} key</button>
      {hasKey && <button disabled={busy} onClick={() => call("PUT", { carrierCode }, "Connection tested.")} className={`${btn} border border-line`}>Test connection</button>}
      {hasKey && <button disabled={busy} onClick={() => confirm("Remove this key?") && call("DELETE", { carrierCode }, "Key removed.")} className={`${btn} border border-line`}>Delete</button>}
    </div>
    <p role="status" aria-live="polite" className={`min-h-4 text-xs ${msg ? (msg.ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-500") : "text-muted"}`}>{busy ? "Working…" : msg ? `${msg.ok ? "✓ " : ""}${msg.text}` : hasKey ? "A key is saved and encrypted." : ""}</p>
  </div>);
}
