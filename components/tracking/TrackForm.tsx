"use client";
import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { Search, ChevronDown } from "lucide-react";
import { CATALOG } from "@/lib/carriers/catalog";
const schema = z.string().trim().regex(/^[A-Za-z0-9-]{6,40}$/, "INVALID_TRACKING_ID");
const carriers: [string, string][] = [["", "Auto Detect"], ["vyoma_test", "VYOMA Test Carrier"], ...CATALOG.filter(c => c.code !== "ship24").map(c => [c.code, c.kind === "ship24" ? `${c.name} (via Ship24)` : c.name] as [string, string]), ["ship24", "Any other carrier (Ship24)"]];
// Custom dropdown: the native <select> popup ignores page width and can spill outside a phone screen; this list never does.
function CarrierSelect({ value, onChange, options, ctl, className = "" }: { value: string; onChange: (v: string) => void; options: [string, string][]; ctl: string; className?: string }) {
  const [open, setOpen] = useState(false); const [act, setAct] = useState(0); const box = useRef<HTMLDivElement>(null); const list = useRef<HTMLUListElement>(null); const lid = useId();
  const sel = Math.max(0, options.findIndex(([v]) => v === value));
  useEffect(() => { if (!open) return; const away = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", away); return () => document.removeEventListener("pointerdown", away); }, [open]);
  useEffect(() => { if (open) list.current?.children[act]?.scrollIntoView({ block: "nearest" }); }, [open, act]);
  const pick = (i: number) => { onChange(options[i][0]); setOpen(false); };
  const key = (e: React.KeyboardEvent) => { const n = options.length;
    if (e.key === "Escape") return setOpen(false);
    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) { e.preventDefault(); if (!open) { setAct(sel); return setOpen(true); }
      setAct(a => e.key === "Home" ? 0 : e.key === "End" ? n - 1 : e.key === "ArrowDown" ? Math.min(n - 1, a + 1) : Math.max(0, a - 1)); }
    else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open ? pick(act) : (setAct(sel), setOpen(true)); } };
  return (<div ref={box} className={`relative ${className}`}>
    <button type="button" role="combobox" aria-label="Carrier" aria-haspopup="listbox" aria-expanded={open} aria-controls={lid} aria-activedescendant={open ? `${lid}-${act}` : undefined}
      onClick={() => { setAct(sel); setOpen(o => !o); }} onKeyDown={key} className={`${ctl} flex items-center justify-between gap-2 text-left`}>
      <span className="truncate">{options[sel][1]}</span><ChevronDown size={16} className={`shrink-0 text-muted transition ${open ? "rotate-180" : ""}`} /></button>
    {open && <ul ref={list} data-lenis-prevent id={lid} role="listbox" aria-label="Carrier" className="absolute left-0 top-full z-50 mt-2 max-h-64 w-max min-w-full max-w-[calc(100vw-2rem)] overflow-y-auto overscroll-contain rounded-xl border border-line bg-card p-1 shadow-2xl">
      {options.map(([v, l], i) => <li key={v} id={`${lid}-${i}`} role="option" aria-selected={i === sel} onClick={() => pick(i)} onMouseEnter={() => setAct(i)}
        className={`cursor-pointer rounded-lg px-3 py-2.5 text-sm ${i === sel ? "font-semibold text-brand" : ""} ${i === act ? "bg-brand/10" : ""}`}>{l}</li>)}</ul>}
  </div>);
}
export default function TrackForm() {
  const r = useRouter(); const [id, setId] = useState(""); const [c, setC] = useState(""); const [err, setErr] = useState("");
  const submit = (e: React.FormEvent) => { e.preventDefault(); const p = schema.safeParse(id);
    if (!p.success) return setErr("Please enter a valid tracking ID (6–40 letters, numbers or dashes).");
    setErr(""); r.push(`/track/${encodeURIComponent(p.data)}${c ? `?carrier=${c}` : ""}`); };
  // One shared look for all three controls: same height, border, radius, font size. Stacked on phones, one row from `sm` up.
  const ctl = "h-12 w-full rounded-xl border border-line bg-card px-4 text-sm text-fg outline-none transition-[border-color,box-shadow] placeholder:text-muted focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/30";
  return (<form onSubmit={submit} id="track" className="mx-auto w-full max-w-3xl">
    <div className="flex flex-col gap-3 rounded-2xl border border-line bg-card/70 p-3 backdrop-blur sm:flex-row sm:items-stretch">
      <input value={id} onChange={e => setId(e.target.value)} aria-label="Tracking ID or AWB" aria-invalid={!!err} placeholder="Enter Tracking ID / AWB" autoComplete="off" autoCapitalize="characters" spellCheck={false}
        className={`${ctl} min-w-0 sm:flex-1`} />
      <CarrierSelect value={c} onChange={setC} options={carriers} ctl={ctl} className="sm:w-60 sm:shrink-0" />
      <button className="inline-flex h-12 w-full shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-brand px-6 text-sm font-semibold text-bg transition-opacity hover:opacity-90 sm:w-auto"><Search size={18} />Track Shipment</button>
    </div>
    {err && <p role="alert" className="mt-2 text-sm text-red-500">{err}</p>}
    <p className="mt-3 text-center text-xs text-muted">Try VYT-INTRANSIT-1001 or VYT-OUTFORDELIVERY-1001</p>
  </form>);
}
