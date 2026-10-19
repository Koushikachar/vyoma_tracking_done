import { Truck, Package, ClipboardList, MapPin, CheckCircle2, AlertTriangle, RotateCcw, Bike, Warehouse } from "lucide-react";
import type { NormalizedShipment, NormalizedEvent, VyomaStatus } from "@/lib/carriers/types";
const TZ = "Asia/Kolkata";
const ICON: Record<VyomaStatus, any> = { ORDER_CREATED: ClipboardList, PICKED_UP: Package, IN_TRANSIT: Truck, AT_DESTINATION_HUB: Warehouse, OUT_FOR_DELIVERY: Bike, DELIVERED: CheckCircle2, DELIVERY_ATTEMPTED: AlertTriangle, EXCEPTION: AlertTriangle, RTO: RotateCcw, RETURNED: RotateCcw, UNKNOWN: MapPin };
const PROG: Partial<Record<VyomaStatus, number>> = { ORDER_CREATED: .06, PICKED_UP: .22, IN_TRANSIT: .5, AT_DESTINATION_HUB: .68, OUT_FOR_DELIVERY: .86, DELIVERY_ATTEMPTED: .86, DELIVERED: 1 };
const STEPS: [VyomaStatus[], string][] = [[["ORDER_CREATED"], "Booked"], [["PICKED_UP"], "Picked up"], [["IN_TRANSIT", "AT_DESTINATION_HUB"], "In transit"], [["OUT_FOR_DELIVERY", "DELIVERY_ATTEMPTED"], "Out for delivery"], [["DELIVERED"], "Delivered"]];
const stepOf = (st: VyomaStatus) => STEPS.findIndex(([a]) => a.includes(st));
const nice = (s: string) => s.replace(/_/g, " ").toLowerCase().replace(/^\w/, c => c.toUpperCase());
const dayKey = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: TZ });
const dayLabel = (d: Date) => { const t = dayKey(new Date()), y = dayKey(new Date(Date.now() - 864e5)), k = dayKey(d);
  return k === t ? "Today" : k === y ? "Yesterday" : d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: TZ }); };
const clock = (d: Date) => d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: TZ });
const PATH = "M 36 150 C 190 -10, 330 250, 484 70 S 590 70 604 54"; // one gentle S-curve; the parcel rides it via CSS offset-path

export default function JourneyView({ s, synced, stale, refreshHref, note }: { s: NormalizedShipment; synced: string; stale: boolean; refreshHref: string; note?: string }) {
  const st = s.currentStatus; const bad = ["EXCEPTION", "RTO", "RETURNED", "DELIVERY_ATTEMPTED"].includes(st); const done = st === "DELIVERED";
  const tone = done ? "16 185 129" : bad ? "245 158 11" : "var(--brand)";
  // progress & active step: exceptions keep the furthest point the parcel had reached
  const reached = Math.max(0, ...s.events.map(e => PROG[e.status] ?? 0)); const p = PROG[st] ?? reached ?? .3;
  const stepNow = stepOf(st) >= 0 ? stepOf(st) : Math.max(0, ...s.events.map(e => stepOf(e.status)));
  const last = s.events.at(-1); const events = [...s.events].reverse();
  const eta = s.estimatedDeliveryAt ? new Date(s.estimatedDeliveryAt) : null;
  const days = eta ? Math.ceil((+eta - Date.now()) / 864e5) : null;
  const etaBig = done ? "Delivered" : !eta ? "—" : days! < 0 ? "Running late" : days === 0 ? "Today" : days === 1 ? "Tomorrow" : `In ${days} days`;
  const groups: [string, NormalizedEvent[]][] = []; for (const e of events) { const l = dayLabel(new Date(e.eventTime)); (groups.at(-1)?.[0] === l ? groups.at(-1)![1] : (groups.push([l, []]), groups.at(-1)![1])).push(e); }
  const stat = "rounded-2xl border border-line bg-card/70 p-4 backdrop-blur";
  return (<div style={{ ["--tone" as any]: tone }} className="space-y-8">
    {/* ───── Hero ───── */}
    <section className="rr-hero relative overflow-hidden rounded-[2rem] border border-line p-6 sm:p-9 shadow-[0_30px_80px_-40px_rgb(var(--tone)/.6)]">
      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div><div className="text-xs uppercase tracking-[.25em] text-muted">{s.carrier.name}</div><div className="mt-1 font-mono text-base sm:text-lg break-all">{s.trackingId}</div></div>
        <span className="inline-flex items-center gap-2 rounded-full border border-line bg-card/80 px-3 py-1.5 text-xs text-muted"><i className="relative grid h-2 w-2 place-items-center"><b className="rr-ping absolute h-2 w-2 rounded-full" style={{ background: "rgb(var(--tone))" }} /><b className="h-2 w-2 rounded-full" style={{ background: "rgb(var(--tone))" }} /></i>{synced}</span>
      </div>
      <h1 className="relative mt-6 text-4xl sm:text-6xl font-black tracking-tight uppercase" style={{ color: "rgb(var(--tone))" }}>{nice(st)}</h1>
      {last?.location && <p className="relative mt-2 flex items-center gap-1.5 text-muted"><MapPin size={16} />Last seen at <b className="text-fg">{last.location}</b></p>}

      {/* route ribbon */}
      <div className="relative mt-8">
        <svg viewBox="0 0 640 200" className="w-full h-auto overflow-visible" role="img" aria-label={`${s.origin ?? "Origin"} to ${s.destination ?? "Destination"}, ${Math.round(p * 100)}% of the way`}>
          <path d={PATH} fill="none" stroke="rgb(var(--line))" strokeWidth="5" strokeLinecap="round" />
          <path d={PATH} fill="none" stroke="rgb(var(--muted)/.55)" strokeWidth="2" strokeDasharray="2 10" strokeLinecap="round" className="rr-flow" />
          <path d={PATH} pathLength={100} fill="none" stroke="rgb(var(--tone))" strokeWidth="5" strokeLinecap="round" strokeDasharray={`${p * 100} 200`} className="rr-done" style={{ filter: "drop-shadow(0 0 8px rgb(var(--tone)/.8))" }} />
          <circle cx="36" cy="150" r="9" fill="rgb(var(--card))" stroke="rgb(var(--tone))" strokeWidth="4" />
          <circle cx="604" cy="54" r="9" fill={done ? "rgb(var(--tone))" : "rgb(var(--card))"} stroke={done ? "rgb(var(--tone))" : "rgb(var(--line))"} strokeWidth="4" />
          <g className="rr-parcel" style={{ offsetPath: `path("${PATH}")`, offsetDistance: `${p * 100}%` }}>
            <circle r="16" fill="rgb(var(--tone)/.35)" className="rr-ping" style={{ transformBox: "fill-box", transformOrigin: "center" }} />
            <circle r="14" fill="rgb(var(--tone))" stroke="rgb(var(--card))" strokeWidth="3" /><circle r="4.5" fill="#fff" /></g>
        </svg>
        <div className="mt-1 flex justify-between gap-4 text-sm"><div><div className="text-xs text-muted">From</div><b>{s.origin ?? "Origin"}</b></div><div className="text-right"><div className="text-xs text-muted">To</div><b>{s.destination ?? "Destination"}</b></div></div>
      </div>

      {/* stage stepper */}
      <ol className="relative mt-8 grid grid-cols-5 gap-1 text-center">{STEPS.map(([, l], i) => { const on = i <= stepNow; const cur = i === stepNow;
        return (<li key={l} className="flex flex-col items-center gap-2"><span className="relative grid h-8 w-8 place-items-center rounded-full border-2 text-xs font-bold transition" style={on ? { background: "rgb(var(--tone))", borderColor: "rgb(var(--tone))", color: "#fff" } : { borderColor: "rgb(var(--line))", color: "rgb(var(--muted))" }}>
          {cur && !done && <span className="rr-ping absolute inset-0 rounded-full" style={{ background: "rgb(var(--tone)/.5)" }} />}{on ? "✓" : i + 1}</span>
          <span className={`text-[11px] sm:text-xs leading-tight ${on ? "text-fg font-medium" : "text-muted"}`}>{l}</span></li>); })}</ol>
    </section>

    {/* ───── Stat tiles ───── */}
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <div className={`${stat} rr-rise`} style={{ animationDelay: ".05s" }}><div className="text-xs text-muted">Arriving</div><div className="mt-1 text-2xl font-bold" style={{ color: "rgb(var(--tone))" }}>{etaBig}</div><div className="text-xs text-muted">{eta ? eta.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: TZ }) : "No estimate yet"}</div></div>
      <div className={`${stat} rr-rise`} style={{ animationDelay: ".12s" }}><div className="text-xs text-muted">Progress</div><div className="mt-1 text-2xl font-bold">{Math.round(p * 100)}%</div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full" style={{ width: `${p * 100}%`, background: "rgb(var(--tone))" }} /></div></div>
      <div className={`${stat} rr-rise`} style={{ animationDelay: ".19s" }}><div className="text-xs text-muted">Last update</div><div className="mt-1 text-lg font-bold">{clock(new Date(s.lastUpdatedAt))}</div><div className="text-xs text-muted">{dayLabel(new Date(s.lastUpdatedAt))}</div></div>
      <div className={`${stat} rr-rise`} style={{ animationDelay: ".26s" }}><div className="text-xs text-muted">Scans</div><div className="mt-1 text-2xl font-bold">{s.events.length}</div><div className="text-xs text-muted">checkpoints so far</div></div>
    </section>

    <div className="flex flex-wrap items-center gap-3 text-sm">
      <a href={refreshHref} className="inline-flex items-center gap-2 rounded-xl border border-line bg-card/70 px-4 py-2 font-medium transition hover:border-brand">↻ Refresh tracking</a>
      {stale && <span role="status" className="text-amber-500">The carrier is temporarily unavailable, so this is the last information we have.</span>}
      {note && <span className="text-muted">{note}</span>}
    </div>

    {/* ───── Journey log ───── */}
    <section aria-label="Shipment history" className="rounded-[2rem] border border-line bg-card/60 p-6 sm:p-8 backdrop-blur">
      <h2 className="text-lg font-semibold">Journey log</h2>
      <div className="mt-6 space-y-8">{groups.map(([day, list], gi) => (<div key={day}>
        <div className="mb-4 text-xs font-semibold uppercase tracking-[.2em] text-muted">{day}</div>
        <ol className="relative ml-4 border-l-2 border-dashed border-line pl-8">{list.map((e, i) => { const I = ICON[e.status] ?? MapPin; const first = gi === 0 && i === 0;
          return (<li key={e.eventTime + i} className="rr-rise relative pb-7 last:pb-0" style={{ animationDelay: `${(gi * 3 + i) * 0.06}s` }}>
            <span className="absolute -left-[3.15rem] top-0 grid h-9 w-9 place-items-center rounded-full border-2 bg-card" style={first ? { borderColor: "rgb(var(--tone))", color: "rgb(var(--tone))", boxShadow: "0 0 0 6px rgb(var(--tone)/.15)" } : { borderColor: "rgb(var(--line))", color: "rgb(var(--muted))" }}><I size={16} /></span>
            <div className={`rounded-2xl border p-4 transition hover:-translate-y-0.5 ${first ? "bg-card" : "border-line bg-card/50"}`} style={first ? { borderColor: "rgb(var(--tone)/.5)" } : undefined}>
              <div className="flex flex-wrap items-baseline justify-between gap-2"><b className={first ? "text-base" : ""}>{nice(e.status)}</b><span className="text-xs text-muted">{clock(new Date(e.eventTime))}</span></div>
              {e.location && <div className="mt-0.5 flex items-center gap-1 text-sm text-muted"><MapPin size={13} />{e.location}</div>}
              {e.description && <p className="mt-2 text-sm text-muted">{e.description}</p>}
            </div></li>); })}</ol></div>))}</div>
    </section>
  </div>);
}
