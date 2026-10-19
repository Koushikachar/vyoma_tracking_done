"use client";
import { useEffect, useRef, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Trends } from "@/lib/trends";
const RANGES = [["today", "Today"], ["7d", "7 days"], ["30d", "30 days"], ["90d", "90 days"], ["all", "All time"]] as const;
type Key = (typeof RANGES)[number][0];
const BRAND = "#5b50e6", RED = "#ef4444";

export default function TrendsCard({ initial }: { initial: Trends }) {
  const [range, setRange] = useState<Key>("7d"); const [data, setData] = useState<Trends>(initial); const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const cache = useRef<Partial<Record<Key, Trends>>>({ "7d": initial }); const ctl = useRef<AbortController | null>(null);
  useEffect(() => () => ctl.current?.abort(), []);
  const pick = async (k: Key) => { // client-side switch: no navigation, no page refresh
    if (k === range && !err) return; setRange(k); setErr(""); ctl.current?.abort();
    const hit = cache.current[k]; if (hit) { setData(hit); setBusy(false); return; }
    const c = (ctl.current = new AbortController()); setBusy(true);
    try { const res = await fetch(`/api/control/trends?range=${k}`, { signal: c.signal, cache: "no-store" }); const j = await res.json();
      if (!res.ok || !j.success) throw new Error(j?.error?.message ?? "Could not load trends.");
      cache.current[k] = j.data; setData(j.data); }
    catch (e) { if ((e as Error).name !== "AbortError") setErr((e as Error).message || "Could not load trends."); }
    finally { if (ctl.current === c) setBusy(false); }
  };
  const axis = { fontSize: 12, fill: "rgb(var(--muted))" };
  return (<div>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="font-semibold">Trends</h2>
      <div role="group" aria-label="Time range" className="-mx-1 flex max-w-full gap-2 overflow-x-auto px-1 pb-1 text-sm">
        {RANGES.map(([k, l]) => <button key={k} type="button" onClick={() => pick(k)} aria-pressed={k === range}
          className={`shrink-0 whitespace-nowrap rounded-full border px-3.5 py-1.5 transition ${k === range ? "border-brand/50 bg-brand/10 font-medium text-brand" : "border-line text-muted hover:text-fg"}`}>{l}</button>)}
      </div>
    </div>
    <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm" aria-live="polite">
      <span className="flex items-center gap-2 text-muted"><i className="h-2.5 w-2.5 rounded-full" style={{ background: BRAND }} />Lookups <b className="text-fg">{data.lookups}</b></span>
      <span className="flex items-center gap-2 text-muted"><i className="h-2.5 w-2.5 rounded-full" style={{ background: RED }} />Failures <b className="text-fg">{data.failures}</b></span>
      {busy && <span className="text-xs text-muted">Updating…</span>}
      {err && <span role="alert" className="flex items-center gap-2 text-xs text-red-500">{err}<button type="button" onClick={() => pick(range)} className="underline">Retry</button></span>}
    </div>
    <div className={`mt-4 h-56 w-full transition-opacity sm:h-72 ${busy ? "opacity-50" : ""}`} role="img" aria-label={`Lookups and failures, ${RANGES.find(([k]) => k === range)![1]}`}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data.points} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <defs><linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={BRAND} stopOpacity={0.28} /><stop offset="100%" stopColor={BRAND} stopOpacity={0} /></linearGradient></defs>
          <CartesianGrid vertical={false} strokeDasharray="3 6" stroke="rgb(var(--line))" />
          <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={false} minTickGap={28} tickMargin={10} />
          <YAxis tick={axis} tickLine={false} axisLine={false} allowDecimals={false} width={44} domain={[0, (m: number) => Math.max(4, m)]} />
          <Tooltip cursor={{ stroke: "rgb(var(--line))" }} contentStyle={{ background: "rgb(var(--card))", border: "1px solid rgb(var(--line))", borderRadius: 12, fontSize: 12 }} />
          <Area type="monotone" dataKey="lookups" name="Lookups" stroke={BRAND} strokeWidth={2.5} fill="url(#trendFill)" dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
          <Area type="monotone" dataKey="failures" name="Failures" stroke={RED} strokeWidth={2} fill="none" dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  </div>);
}
