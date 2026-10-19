"use client";
import { setTheme } from "@/lib/theme";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, Moon, Sun, X } from "lucide-react";
const links = [{ href: "/", label: "Home" }, { href: "/pricing", label: "Pricing" }, { href: "/about", label: "About" }, { href: "/contact", label: "Contact" }, { href: "/seller", label: "For sellers" }];
const isActive = (path: string, href: string) => (href === "/" ? path === "/" : path === href || path.startsWith(href + "/"));
export default function Navbar() {
  const path = usePathname(); const [scrolled, setScrolled] = useState(false); const [open, setOpen] = useState(false); const [dark, setDark] = useState(false);
  useEffect(() => { setDark(document.documentElement.classList.contains("dark")); const on = () => setScrolled(scrollY > 12); on(); addEventListener("scroll", on, { passive: true }); return () => removeEventListener("scroll", on); }, []);
  useEffect(() => setOpen(false), [path]);
  useEffect(() => { document.body.style.overflow = open ? "hidden" : ""; const k = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false); addEventListener("keydown", k); return () => { document.body.style.overflow = ""; removeEventListener("keydown", k); }; }, [open]);
  const toggle = () => { const d = !dark; setDark(d); setTheme(d); };
  const Theme = <button onClick={toggle} aria-label="Toggle theme" className="p-2 rounded-xl border border-line hover:bg-card/60 transition">{dark ? <Sun size={18} /> : <Moon size={18} />}</button>;
  const Cta = (c = "") => <Link href="/#track" className={`rounded-xl bg-brand text-bg px-4 py-2 text-sm font-semibold text-center ${c}`}>Track Shipment</Link>;
  if (path.startsWith("/control")) return null; // admin has its own sidebar
  return (<>
    <header className={`sticky top-0 z-50 transition-all ${scrolled || open ? "bg-bg/60 backdrop-blur-xl border-b border-line" : "border-b border-transparent"}`}>
      <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
        <Link href="/" className="font-bold tracking-[0.25em]">VYOMA ROUTE</Link>
        <nav className="hidden md:flex items-center gap-7 text-sm">{links.map(l => <Link key={l.href} href={l.href} aria-current={isActive(path, l.href) ? "page" : undefined} className={`relative py-1 transition ${isActive(path, l.href) ? "font-semibold text-brand after:absolute after:inset-x-0 after:-bottom-1 after:h-0.5 after:rounded-full after:bg-brand" : "text-muted hover:text-fg"}`}>{l.label}</Link>)}{Theme}{Cta()}</nav>
        <div className="md:hidden flex gap-2">{Theme}<button aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen(o => !o)} className="p-2 rounded-xl border border-line">{open ? <X size={18} /> : <Menu size={18} />}</button></div>
      </div></header>
    <AnimatePresence>{open && <motion.div key="overlay" className="fixed inset-0 z-40 md:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} onClick={() => setOpen(false)}>
      <div className="absolute inset-0 bg-bg/30 backdrop-blur-2xl backdrop-saturate-150" />
      <motion.nav aria-label="Mobile" onClick={e => e.stopPropagation()} className="liquid absolute inset-x-4 top-20 rounded-3xl p-6"
        initial={{ opacity: 0, y: -18, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -12, scale: 0.97 }} transition={{ type: "spring", stiffness: 320, damping: 28 }}>
        <ul className="space-y-1">{links.map((l, i) => <motion.li key={l.href} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.06 + i * 0.06 }}>
          <Link href={l.href} aria-current={isActive(path, l.href) ? "page" : undefined} className={`relative flex items-center justify-between rounded-xl px-4 py-3 text-lg transition ${isActive(path, l.href) ? "bg-brand/15 font-semibold text-brand" : "font-medium hover:bg-card/50"}`}>
            {isActive(path, l.href) && <span className="absolute left-0 top-2.5 bottom-2.5 w-1 rounded-full bg-brand" />}{l.label}{isActive(path, l.href) && <span className="text-xs font-medium uppercase tracking-widest opacity-80">You're here</span>}</Link></motion.li>)}</ul>
        <motion.div className="mt-4 grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}>{Cta("py-3")}</motion.div>
      </motion.nav></motion.div>}</AnimatePresence></>);
}
