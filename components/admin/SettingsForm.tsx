"use client";
import { useState } from "react";
import type { Settings } from "@/lib/settings";
export default function SettingsForm({ initial }: { initial: Settings }) {
  const [s, setS] = useState(initial); const [msg, setMsg] = useState("");
  const save = async () => { const r = await fetch("/api/control/settings", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(s) }); setMsg(r.ok ? "Saved. Applies within 30 seconds." : "Invalid values."); };
  const i = "rounded-xl border border-line bg-transparent px-3 py-2 w-full"; const L = ({ t, children }: { t: string; children: React.ReactNode }) => <label className="block text-sm"><span className="text-muted">{t}</span>{children}</label>;
  return (<div className="space-y-4 max-w-md">
    <L t="Cache duration (seconds)"><input className={i} type="number" min={0} max={86400} value={s.cacheSeconds} onChange={e => setS({ ...s, cacheSeconds: +e.target.value })} /></L>
    <L t="Public tracking limit (requests per minute per IP)"><input className={i} type="number" min={1} max={600} value={s.publicRatePerMinute} onChange={e => setS({ ...s, publicRatePerMinute: +e.target.value })} /></L>
    <L t="Retention: delete lookup logs and processed webhooks older than (days)"><input className={i} type="number" min={7} max={3650} value={s.retentionDays} onChange={e => setS({ ...s, retentionDays: +e.target.value })} /></L>
    <L t="Alert when a carrier's success rate (last hour, 10+ lookups) falls below (%)"><input className={i} type="number" min={1} max={100} value={s.alertThreshold} onChange={e => setS({ ...s, alertThreshold: +e.target.value })} /></L>
    <L t="Time zone (e.g. Asia/Kolkata)"><input className={i} value={s.timeZone} onChange={e => setS({ ...s, timeZone: e.target.value })} /></L>
    <L t="Contact notification email"><input className={i} type="email" value={s.notifyEmail} onChange={e => setS({ ...s, notifyEmail: e.target.value })} /></L>
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={s.maintenanceMode} onChange={e => setS({ ...s, maintenanceMode: e.target.checked })} />Maintenance mode (public tracking returns “temporarily unavailable”)</label>
    <button onClick={save} className="rounded-xl bg-brand text-bg font-semibold px-5 py-2">Save settings</button><p role="status" className="text-sm text-muted">{msg}</p></div>);
}
