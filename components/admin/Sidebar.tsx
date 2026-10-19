"use client";
import { setTheme } from "@/lib/theme";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Package, FlaskConical, Plug, Activity, KeyRound, Webhook, Users, Settings, Mail, ScrollText, ShieldCheck, LogOut, Moon, Sun, LayoutGrid, X, Store, Tag, ListChecks } from "lucide-react";
const ICONS: Record<string, any> = { dashboard: LayoutDashboard, shipments: Package, sellers: Store, plans: Tag, jobs: ListChecks, "tracking-lab": FlaskConical, integrations: Plug, "carrier-health": Activity, "api-keys": KeyRound, webhooks: Webhook, users: Users, settings: Settings, "contact-messages": Mail, "audit-logs": ScrollText, security: ShieldCheck };
const PINNED = ["dashboard", "shipments", "tracking-lab", "carrier-health"]; // shown in the mobile bottom bar; everything else lives in "All pages"

export default function Sidebar({ route, items, email, role }: { route: string; items: [string, string][]; email: string; role: string }) {
  const path = usePathname(); const [dark, setDark] = useState(false); const [sheet, setSheet] = useState(false);
  useEffect(() => setDark(document.documentElement.classList.contains("dark")), []);
  useEffect(() => setSheet(false), [path]); // close the sheet after navigating
  useEffect(() => { // lock page scroll while the sheet is open, close on Escape
    document.body.style.overflow = sheet ? "hidden" : ""; const k = (e: KeyboardEvent) => e.key === "Escape" && setSheet(false);
    addEventListener("keydown", k); return () => { document.body.style.overflow = ""; removeEventListener("keydown", k); };
  }, [sheet]);
  const toggle = () => { const d = !dark; setDark(d); setTheme(d); };
  const isOn = (h: string) => path.includes(`/${route}/${h}`);
  const pinned = items.filter(([h]) => PINNED.includes(h)); const moreActive = items.some(([h]) => !PINNED.includes(h) && isOn(h));
  const btn = "flex w-full items-center gap-3 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm text-muted hover:bg-line/60 hover:text-fg transition";
  const iconBtn = "grid h-10 w-10 place-items-center rounded-xl border border-line bg-card/70 text-muted hover:text-fg transition";
  return (<>
    {/* ───────── Desktop sidebar ───────── */}
    <aside className="thin-scroll hidden md:flex md:flex-col gap-1 md:w-64 md:min-h-screen md:sticky md:top-0 md:h-screen shrink-0 border-r border-line bg-card/70 backdrop-blur-xl p-4 overflow-x-hidden overflow-y-auto">
      <div className="flex items-center gap-2 px-3 py-4 font-bold tracking-[0.2em]"><span className="grid place-items-center w-8 h-8 rounded-xl admin-hero text-sm">V</span>VYOMA</div>
      {items.map(([h, l]) => { const I = ICONS[h] ?? LayoutDashboard; const on = isOn(h);
        return (<Link key={h} href={`/control/${route}/${h}`} className={`relative flex items-center gap-3 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm transition ${on ? "bg-brand/12 text-brand font-semibold" : "text-muted hover:bg-line/60 hover:text-fg"}`}>
          {on && <span className="absolute left-0 top-2 bottom-2 w-1 rounded-full bg-brand" />}<I size={18} />{l}</Link>); })}
      <div className="mt-auto pt-4 border-t border-line flex flex-col gap-1">
        <div className="px-3 pb-2 text-xs text-muted truncate">{email}<br />{role}</div>
        <button type="button" onClick={toggle} className={btn}>{dark ? <Sun size={18} /> : <Moon size={18} />}{dark ? "Light mode" : "Dark mode"}</button>
        <form action="/api/control/logout" method="post"><button className={btn}><LogOut size={18} />Logout</button></form>
      </div>
    </aside>

    {/* ───────── Mobile top bar ───────── */}
    <header className="md:hidden sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-card/80 px-4 py-3 backdrop-blur-xl">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl admin-hero font-bold">V</span>
      <div className="min-w-0 flex-1 leading-tight"><div className="truncate text-sm font-semibold">{email}</div><div className="truncate text-[11px] tracking-wider text-muted">{role}</div></div>
      <button type="button" onClick={toggle} aria-label="Toggle theme" className={iconBtn}>{dark ? <Sun size={18} /> : <Moon size={18} />}</button>
      <form action="/api/control/logout" method="post"><button aria-label="Logout" className={iconBtn}><LogOut size={18} /></button></form>
    </header>

    {/* ───────── Mobile bottom bar ───────── */}
    <nav aria-label="Admin" className="md:hidden fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card/90 backdrop-blur-xl" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <ul className="flex items-center justify-around px-2 py-2">
        {pinned.map(([h, l]) => { const I = ICONS[h] ?? LayoutDashboard; const on = isOn(h);
          return (<li key={h}><Link href={`/control/${route}/${h}`} aria-label={l} aria-current={on ? "page" : undefined} className={`grid h-11 w-14 place-items-center rounded-2xl transition ${on ? "bg-brand/15 text-brand" : "text-muted"}`}><I size={21} /></Link></li>); })}
        <li><button type="button" aria-label="All pages" aria-expanded={sheet} onClick={() => setSheet(true)} className={`grid h-11 w-14 place-items-center rounded-2xl transition ${moreActive || sheet ? "bg-brand/15 text-brand" : "text-muted"}`}><LayoutGrid size={21} /></button></li>
      </ul>
    </nav>

    {/* ───────── "All pages" sheet ───────── */}
    {sheet && <div className="md:hidden fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="All pages">
      <button type="button" aria-label="Close" onClick={() => setSheet(false)} className="absolute inset-0 bg-black/45 backdrop-blur-sm" />
      <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-3xl border-t border-line bg-card px-5 pt-3 shadow-2xl" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.5rem)" }}>
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-line" />
        <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold">All pages</h2><button type="button" onClick={() => setSheet(false)} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-xl text-muted hover:bg-line/60"><X size={20} /></button></div>
        <ul className="grid grid-cols-4 gap-x-2 gap-y-5">
          {items.map(([h, l]) => { const I = ICONS[h] ?? LayoutDashboard; const on = isOn(h);
            return (<li key={h}><Link href={`/control/${route}/${h}`} className="flex flex-col items-center gap-2 text-center">
              <span className={`grid h-14 w-14 place-items-center rounded-2xl border transition ${on ? "border-brand/40 bg-brand/15 text-brand" : "border-line bg-card text-muted"}`}><I size={22} /></span>
              <span className={`text-[11px] leading-tight ${on ? "font-semibold text-brand" : "text-muted"}`}>{l}</span></Link></li>); })}
        </ul>
      </div></div>}
  </>);
}
