"use client";
import { useEffect } from "react";
// GSAP is loaded only on the home page, only after paint, and never for reduced-motion users. Content is never hidden, so LCP is unaffected.
export default function HeroMotion() {
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let ctx: { revert(): void } | undefined, dead = false;
    Promise.all([import("gsap"), import("gsap/ScrollTrigger")]).then(([{ gsap }, { ScrollTrigger }]) => {
      if (dead) return; gsap.registerPlugin(ScrollTrigger);
      ctx = gsap.context(() => {
        gsap.from("[data-hero]", { y: 14, duration: 0.8, ease: "power3.out" });
        gsap.to("#hero .node", { y: -10, duration: 2.2, ease: "sine.inOut", yoyo: true, repeat: -1, stagger: 0.4 });
        gsap.to("#hero .aurora", { yPercent: 12, ease: "none", scrollTrigger: { trigger: "#hero", start: "top top", end: "bottom top", scrub: true } });
      });
    });
    return () => { dead = true; ctx?.revert(); };
  }, []);
  return null;
}
