"use client";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Saved from "@/components/seller/Saved";
import { Upload, Download } from "lucide-react";
import { chargeableWeight } from "@/lib/seller/weight";
import { readCsv, pick, num, csvOut, cell } from "@/lib/seller/csv";
const inp = "h-11 w-full min-w-0 rounded-xl border border-line bg-card px-3 text-sm text-fg outline-none placeholder:text-muted focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/30";
const kg = (v: number) => `${(Math.round(v * 1000) / 1000).toString()} kg`;
type SavedW = { id: string; awb: string; billedKg: number; expectedKg: number; excessKg: number; reason: string; status: string; note: string | null };
export default function WeightTool({ saved, settings }: { saved: SavedW[]; settings: { divisor: number; slab: number; tolerance: number } }) {
  const file = useRef<HTMLInputElement>(null);
  const [div, setDiv] = useState(String(settings.divisor)); const [slab, setSlab] = useState(String(settings.slab)); const [tol, setTol] = useState(String(settings.tolerance));
  const [c, setC] = useState({ l: "", w: "", h: "", a: "" }); const [rows, setRows] = useState<Record<string, string>[]>([]); const [err, setErr] = useState("");
  const D = Math.max(1, num(div) || 5000), S = Math.max(0.01, num(slab) || 0.5), T = Math.max(0, num(tol) || 0);
  // Chargeable weight = the higher of actual and volumetric (L×W×H cm ÷ divisor), rounded UP to the courier's slab. Use YOUR contract's divisor and slab.
  const calc = (l: number, w: number, h: number, a: number) => chargeableWeight(l, w, h, a, D, S);
  const one = (() => { const [l, w, h, a] = [c.l, c.w, c.h, c.a].map(num); return [l, w, h, a].every(Number.isFinite) ? calc(l, w, h, a) : null; })();
  const out = useMemo(() => rows.map(r => { const l = num(pick(r, ["length", "l"])), w = num(pick(r, ["width", "w"])), h = num(pick(r, ["height", "h"])), a = num(pick(r, ["weight", "actualweight", "declaredweight", "declared"])), billed = num(pick(r, ["billedweight", "billed", "chargedweight", "chargeableweight"]));
    const ok = [l, w, h, a, billed].every(Number.isFinite); const e = ok ? calc(l, w, h, a) : null; const diff = e ? billed - e.charge : NaN;
    return { awb: pick(r, ["awb", "tracking", "trackingid"]) || "—", ok, a, billed, vol: e?.vol ?? NaN, expected: e?.charge ?? NaN, diff, flag: ok && diff > T + 1e-9 }; }), [rows, D, S, T]);
  const flagged = out.filter(o => o.flag); const excess = flagged.reduce((s, o) => s + o.diff, 0); const bad = out.filter(o => !o.ok).length;
  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => { const t = await e.target.files?.[0]?.text(); e.target.value = ""; if (!t) return; const r = readCsv(t); if (!r.length) return setErr("That file has no rows."); setErr(""); setRows(r.slice(0, 5000)); };
  const why = (o: (typeof out)[number]) => `Billed ${kg(o.billed)} but expected ${kg(o.expected)} (volumetric ${kg(o.vol)}, declared ${kg(o.a)}, ${S} kg slab)`;
  const router = useRouter(); const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const post = async (b: object) => { const r = await fetch("/api/seller/records", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(b) }); return r.json().catch(() => ({ success: false, error: { message: "Unexpected response." } })); };
  const saveCases = async () => { const j = await post({ action: "weight-save", settings: { divisor: D, slab: S, tolerance: T }, cases: flagged.map(o => ({ awb: o.awb, declaredKg: o.a, volumetricKg: o.vol, expectedKg: o.expected, billedKg: o.billed, reason: why(o) })) }); setMsg(j.success ? { ok: true, t: `${j.added} saved${j.skipped ? `, ${j.skipped} were already saved` : ""}. Your divisor, slab and tolerance were saved too.` } : { ok: false, t: j.error?.message ?? "Failed." }); if (j.success) router.refresh(); };
  const change = async (id: string, status: string, note: string) => { const j = await post({ action: "weight-status", id, status, note }); if (j.success) router.refresh(); else setMsg({ ok: false, t: j.error?.message ?? "Failed." }); return !!j.success; };
  return (<section className="space-y-5" aria-label="Weight discrepancy">
    <p className="text-sm text-muted">Check whether a courier billed more weight than your declared size and weight justify. Set the divisor and slab from your courier contract.</p>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">{[["Volumetric divisor", div, setDiv, "5000"], ["Slab (kg)", slab, setSlab, "0.5"], ["Tolerance (kg)", tol, setTol, "0.1"]].map(([l, v, f, p]: any) => <label key={l} className="text-xs text-muted">{l}<input className={`${inp} mt-1`} inputMode="decimal" value={v} onChange={e => f(e.target.value)} placeholder={p} /></label>)}</div>
    <div className="rounded-2xl border border-line bg-card/70 p-4 backdrop-blur sm:p-5"><h2 className="font-semibold">Quick calculator</h2>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">{([["l", "Length (cm)"], ["w", "Width (cm)"], ["h", "Height (cm)"], ["a", "Actual weight (kg)"]] as const).map(([k, p]) => <input key={k} className={inp} inputMode="decimal" placeholder={p} aria-label={p} value={c[k]} onChange={e => setC({ ...c, [k]: e.target.value })} />)}</div>
      {one && <p className="mt-3 text-sm">Volumetric <b>{kg(one.vol)}</b> · Chargeable weight <b className="text-brand">{kg(one.charge)}</b></p>}</div>
    <div className="flex flex-wrap gap-2"><button onClick={() => file.current?.click()} className="inline-flex h-10 items-center gap-2 rounded-xl border border-line bg-card/70 px-3.5 text-sm font-medium hover:border-brand"><Upload size={16} />Upload courier invoice CSV</button><input ref={file} type="file" accept=".csv,text/csv" hidden onChange={onFile} />
      <button onClick={() => csvOut("weight-template.csv", ["awb,length,width,height,weight,billed_weight", "AWB123456,30,20,15,1.0,2.5"])} className="inline-flex h-10 items-center gap-2 rounded-xl border border-line bg-card/70 px-3.5 text-sm font-medium hover:border-brand"><Download size={16} />CSV template</button>
      <button disabled={!flagged.length} onClick={() => csvOut("weight-disputes.csv", ["AWB,Declared kg,Volumetric kg,Expected kg,Billed kg,Excess kg,Reason", ...flagged.map(o => [o.awb, o.a, o.vol.toFixed(3), o.expected, o.billed, o.diff.toFixed(3), why(o)].map(cell).join(","))])} className="inline-flex h-10 items-center gap-2 rounded-xl border border-line bg-card/70 px-3.5 text-sm font-medium hover:border-brand disabled:opacity-40"><Download size={16} />Export disputes</button>
      <button disabled={!flagged.length} onClick={saveCases} className="inline-flex h-10 items-center gap-2 rounded-xl border border-line bg-card/70 px-3.5 text-sm font-medium hover:border-brand disabled:opacity-40">Save disputes ({flagged.length})</button></div>
    {err && <p role="alert" className="text-sm text-red-500">{err}</p>}
    {msg && <p role="status" className={`text-sm ${msg.ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>{msg.t}</p>}
    {!!out.length && <><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[["Rows checked", out.length - bad, ""], ["Possible overcharges", flagged.length, flagged.length ? "text-red-500" : ""], ["Excess weight", kg(excess), ""], ["Rows skipped", bad, bad ? "text-amber-500" : ""]].map(([l, v, cl]) => <div key={l as string} className="rounded-2xl border border-line bg-card/70 p-4"><div className="text-xs text-muted">{l}</div><div className={`mt-1 text-2xl font-bold ${cl}`}>{v}</div></div>)}</div>
      {bad > 0 && <p className="text-xs text-amber-600 dark:text-amber-400">{bad} row(s) skipped: they need numeric length, width, height, weight and billed weight.</p>}
      {!flagged.length ? <p className="rounded-2xl border border-dashed border-line p-8 text-center text-sm text-muted">No billed weight is above what your sizes justify.</p> : <ul className="space-y-3">{flagged.map(o => <li key={o.awb + o.billed} className="rounded-2xl border border-red-500/30 bg-card/70 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><span className="font-mono text-sm">{o.awb}</span><span className="text-sm font-semibold text-red-500">+{kg(o.diff)} over</span></div><p className="mt-1 text-sm text-muted">{why(o)}</p></li>)}</ul>}</>}
    <Saved heading="Saved weight disputes" statuses={["OPEN", "DISPUTED", "WON", "LOST", "CLOSED"]} onChange={change} items={saved.map(s => ({ id: s.id, title: s.awb, sub: `Billed ${s.billedKg} kg, expected ${s.expectedKg} kg (+${s.excessKg} kg). ${s.reason}`, status: s.status, note: s.note }))} />
    <p className="text-xs text-muted">Results compare against the divisor and slab you enter, not your actual contract. Always confirm with your courier agreement before raising a dispute.</p>
  </section>);
}
