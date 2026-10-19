"use client";
import { useState } from "react";
export type SavedItem = { id: string; title: string; sub: string; status: string; note: string | null };
// Follow-up list shared by COD issues and weight disputes: change the status, add a note, both saved on the server.
export default function Saved({ heading, items, statuses, onChange }: { heading: string; items: SavedItem[]; statuses: string[]; onChange: (id: string, status: string, note: string) => Promise<boolean> }) {
  const [busy, setBusy] = useState<string | null>(null); if (!items.length) return null;
  const go = async (i: SavedItem, status: string, note: string) => { setBusy(i.id); await onChange(i.id, status, note); setBusy(null); };
  return (<div className="space-y-3"><h2 className="font-semibold">{heading} <span className="text-sm font-normal text-muted">({items.length})</span></h2>
    <ul className="space-y-3">{items.map(i => <li key={i.id} className="rounded-2xl border border-line bg-card/70 p-4"><div className="font-mono text-sm break-all">{i.title}</div><p className="mt-1 text-sm text-muted">{i.sub}</p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row"><select aria-label="Status" disabled={busy === i.id} value={i.status} onChange={e => go(i, e.target.value, i.note ?? "")} className="field h-10 w-full rounded-xl border border-line bg-card px-3 text-sm sm:w-44">{statuses.map(s => <option key={s} value={s}>{s[0] + s.slice(1).toLowerCase()}</option>)}</select>
        <input aria-label="Note" maxLength={300} defaultValue={i.note ?? ""} placeholder="Add a note (ticket number, who you spoke to…)" onBlur={e => e.target.value !== (i.note ?? "") && go(i, i.status, e.target.value)} className="h-10 min-w-0 flex-1 rounded-xl border border-line bg-card px-3 text-sm outline-none placeholder:text-muted focus-visible:border-brand" /></div></li>)}</ul></div>);
}
