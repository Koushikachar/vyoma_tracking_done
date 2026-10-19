"use client";
import { fmtDateTime } from "@/lib/format";
import { useState } from "react";
import { useRouter } from "next/navigation";
type Conn = { delhivery: boolean; woo: string | null; wooSynced: string | null };
const inp = "h-11 w-full min-w-0 rounded-xl border border-line bg-card px-3 text-sm text-fg outline-none placeholder:text-muted focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/30";
const card = "rounded-2xl border border-line bg-card/70 p-4 backdrop-blur sm:p-5";
export default function Connections({ conn }: { conn: Conn }) {
  const r = useRouter(); const [busy, setBusy] = useState(""); const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [dh, setDh] = useState(""); const [w, setW] = useState({ url: "", key: "", secret: "" });
  const run = async (id: string, body: object, ok: (j: any) => string, after?: () => void) => { setBusy(id); setMsg(null);
    try { const res = await fetch("/api/seller/connections", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }); const j = await res.json();
      if (j.success) { setMsg({ ok: true, t: ok(j) }); after?.(); r.refresh(); } else setMsg({ ok: false, t: j.error?.message ?? "Failed." }); }
    catch { setMsg({ ok: false, t: "Network error. Please try again." }); } finally { setBusy(""); } };
  const btn = "h-11 rounded-xl px-4 text-sm font-semibold transition disabled:opacity-50";
  return (<section className="space-y-4" aria-label="Connections">
    <p className="text-sm text-muted">Connect your own accounts. Keys are encrypted and never shown again.</p>
    {msg && <p role="status" className={`rounded-xl border px-4 py-2.5 text-sm ${msg.ok ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400" : "border-red-500/40 text-red-500"}`}>{msg.t}</p>}
    <div className={card}><div className="flex items-center justify-between gap-2"><h2 className="font-semibold">Delhivery</h2><span className={`rounded-full px-2.5 py-0.5 text-xs ${conn.delhivery ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-line text-muted"}`}>{conn.delhivery ? "Connected" : "Not connected"}</span></div>
      <p className="mt-1 text-sm text-muted">Lets you ask Delhivery to re-attempt a failed delivery or fix an address straight from your NDR inbox. Use the API token from your own Delhivery account.</p>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row"><input className={inp} type="password" autoComplete="off" placeholder={conn.delhivery ? "•••••••• (saved, paste to replace)" : "Your Delhivery API token"} value={dh} onChange={e => setDh(e.target.value)} aria-label="Delhivery token" />
        <button disabled={!!busy || dh.trim().length < 8} onClick={() => run("dh", { action: "save-delhivery", token: dh }, () => "Delhivery token saved.", () => setDh(""))} className={`${btn} bg-brand text-bg hover:opacity-90`}>{busy === "dh" ? "Saving…" : "Save"}</button>
        {conn.delhivery && <button disabled={!!busy} onClick={() => confirm("Remove your Delhivery token?") && run("dhx", { action: "disconnect", kind: "DELHIVERY" }, () => "Delhivery disconnected.")} className={`${btn} border border-line`}>Remove</button>}</div></div>
    <div className={card}><div className="flex items-center justify-between gap-2"><h2 className="font-semibold">WooCommerce store</h2><span className={`rounded-full px-2.5 py-0.5 text-xs ${conn.woo ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-line text-muted"}`}>{conn.woo ? "Connected" : "Not connected"}</span></div>
      {conn.woo ? <><p className="mt-1 break-all text-sm text-muted">{conn.woo}{conn.wooSynced ? ` · last import ${fmtDateTime(conn.wooSynced)}` : ""}</p>
        <div className="mt-3 flex flex-wrap gap-3"><button disabled={!!busy} onClick={() => run("sync", { action: "sync-woo" }, j => `Imported ${j.added} new order(s)${j.skipped ? `, ${j.skipped} already there` : ""}${j.capped ? ". Your plan's order limit was reached." : "."}`)} className={`${btn} bg-brand text-bg hover:opacity-90`}>{busy === "sync" ? "Importing…" : "Import new orders"}</button>
          <button disabled={!!busy} onClick={() => confirm("Disconnect this store?") && run("wx", { action: "disconnect", kind: "WOOCOMMERCE" }, () => "Store disconnected.")} className={`${btn} border border-line`}>Disconnect</button></div></> :
        <><p className="mt-1 text-sm text-muted">In WooCommerce go to Settings → Advanced → REST API, add a key with <b>Read</b> permission, and paste it here. Imports your processing and on-hold orders.</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3"><input className={inp} placeholder="https://yourstore.com" value={w.url} onChange={e => setW({ ...w, url: e.target.value })} aria-label="Store address" /><input className={inp} type="password" autoComplete="off" placeholder="Consumer key (ck_…)" value={w.key} onChange={e => setW({ ...w, key: e.target.value })} aria-label="Consumer key" /><input className={inp} type="password" autoComplete="off" placeholder="Consumer secret (cs_…)" value={w.secret} onChange={e => setW({ ...w, secret: e.target.value })} aria-label="Consumer secret" /></div>
          <button disabled={!!busy || !w.url || !w.key || !w.secret} onClick={() => run("wc", { action: "connect-woo", ...w }, () => "Store connected. Press “Import new orders”.", () => setW({ url: "", key: "", secret: "" }))} className={`${btn} mt-3 bg-brand text-bg hover:opacity-90`}>{busy === "wc" ? "Checking…" : "Connect store"}</button></>}</div>
  </section>);
}
