"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
// Lenis smooth scrolling on public pages only; skipped for reduced-motion users and the admin area. Library loads lazily.
export default function SmoothScroll() {
  const path = usePathname();
  useEffect(() => {
    if (path.startsWith("/control") || matchMedia("(prefers-reduced-motion: reduce)").matches || matchMedia("(pointer: coarse)").matches || matchMedia("(max-width: 1023px)").matches) return; // phones and tablets keep native touch scrolling
    let raf = 0, lenis: { raf(t: number): void; destroy(): void } | undefined, dead = false;
    import("lenis").then(({ default: Lenis }) => { if (dead) return; lenis = new Lenis(); const loop = (t: number) => { lenis!.raf(t); raf = requestAnimationFrame(loop); }; raf = requestAnimationFrame(loop); });
    return () => { dead = true; cancelAnimationFrame(raf); lenis?.destroy(); };
  }, [path]);
  return null;
}
