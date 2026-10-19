"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
export default function LogoUpload({ merchantId, version, allowed }: { merchantId: string; version: number | null; allowed: boolean }) {
  const r = useRouter(); const file = useRef<HTMLInputElement>(null); const [busy, setBusy] = useState(false); const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const done = (ok: boolean, t: string) => { setMsg({ ok, t }); setBusy(false); if (ok) r.refresh(); };
  const pick = async (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; e.target.value = ""; if (!f) return; setBusy(true); setMsg(null);
    try { // shrink to 256 px and re-encode as PNG in the browser (also strips metadata)
      const bmp = await createImageBitmap(f); const s = Math.min(1, 256 / Math.max(bmp.width, bmp.height)); const c = document.createElement("canvas"); c.width = Math.max(1, Math.round(bmp.width * s)); c.height = Math.max(1, Math.round(bmp.height * s)); c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
      const blob: Blob | null = await new Promise(res => c.toBlob(res, "image/png")); if (!blob) return done(false, "Could not read that image.");
      const res = await fetch("/api/seller/logo", { method: "POST", body: blob }); const j = await res.json(); done(!!j.success, j.success ? "Logo saved." : j.error?.message ?? "Upload failed."); }
    catch { done(false, "Please choose a PNG, JPG or WebP image."); } };
  const remove = async () => { setBusy(true); const res = await fetch("/api/seller/logo", { method: "DELETE" }); done(res.ok, res.ok ? "Logo removed." : "Could not remove it."); };
  return (<div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line pt-4"><div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl border border-line bg-white">{version ? <img src={`/api/public/logo/${merchantId}?v=${version}`} alt="Your logo" className="h-full w-full object-contain" /> : <span className="text-xs text-muted">Logo</span>}</div>
    <div className="min-w-0 flex-1 text-sm"><div className="font-medium">Brand logo</div><div className="text-xs text-muted">{allowed ? "PNG, JPG or WebP. It is shrunk to fit automatically." : "Available on the Growth plan."}</div></div>
    <button disabled={busy || !allowed} onClick={() => file.current?.click()} className="h-10 rounded-xl border border-line px-3.5 text-sm font-medium transition hover:border-brand disabled:opacity-40">{version ? "Replace" : "Upload"}</button><input ref={file} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={pick} />
    {version && <button disabled={busy} onClick={remove} className="h-10 rounded-xl px-3 text-sm text-red-500 hover:bg-red-500/10 disabled:opacity-40">Remove</button>}
    {msg && <p role="status" className={`w-full text-xs ${msg.ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>{msg.t}</p>}</div>);
}
