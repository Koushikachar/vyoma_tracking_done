"use client";
import { useState } from "react";
const SC = ["ORDER","PICKED","INTRANSIT","DESTINATION","OUTFORDELIVERY","DELIVERED","ATTEMPTED","EXCEPTION","RTO","RETURNED","UNKNOWN","NOTFOUND","RATE-LIMIT","OUTAGE"].map(s => `VYT-${s}-1001`);
const run = async (trackingId: string, carrier?: string) => (await fetch("/api/control/lab", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ trackingId, carrier: carrier || undefined }) })).json();
export default function Lab() {
  const [id, setId] = useState("VYT-INTRANSIT-1001"); const [c, setC] = useState(""); const [out, setOut] = useState<any>(null); const [all, setAll] = useState<any[]>([]); const [busy, setBusy] = useState(false);
  const inp = "rounded-xl border border-line bg-transparent px-3 py-2";
  return (<div className="space-y-6"><div className="flex flex-wrap gap-2">
    <input className={`${inp} flex-1 min-w-48`} value={id} onChange={e => setId(e.target.value)} aria-label="Tracking ID" />
    <select className={inp} value={c} onChange={e => setC(e.target.value)}><option value="">Auto detect</option><option value="vyoma_test">VYOMA Test Carrier</option><option value="delhivery">Delhivery</option><option value="dhl">DHL</option><option value="fedex">FedEx</option><option value="ups">UPS</option><option value="ship24">Ship24 (any carrier)</option></select>
    <button disabled={busy} className="rounded-xl bg-brand text-bg px-4 py-2 font-semibold" onClick={async () => { setBusy(true); setOut(await run(id, c)); setBusy(false); }}>Run</button>
    <button disabled={busy} className="rounded-xl border border-line px-4 py-2" onClick={async () => { setBusy(true); setAll([]); const r: any[] = [];
      for (const s of SC) { const j = await run(s, "vyoma_test"); r.push({ id: s, result: j.result, status: j.normalized?.currentStatus, ms: j.latencyMs }); setAll([...r]); } setBusy(false); }}>Run all test scenarios</button></div>
    {out && <pre className="text-xs overflow-auto rounded-xl border border-line p-4 bg-card">{JSON.stringify(out, null, 2)}</pre>}
    {all.length > 0 && <table className="w-full text-sm"><tbody>{all.map(r => <tr key={r.id} className="border-t border-line"><td className="py-1 font-mono">{r.id}</td><td>{r.result}</td><td>{r.status ?? "—"}</td><td>{r.ms} ms</td></tr>)}</tbody></table>}</div>);
}
