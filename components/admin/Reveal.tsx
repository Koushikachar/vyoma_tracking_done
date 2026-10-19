"use client";
import { motion, animate, useMotionValue, useTransform } from "framer-motion";
import { useEffect } from "react";
export function Reveal({ children, i = 0, className = "" }: { children: React.ReactNode; i?: number; className?: string }) {
  return <motion.div className={className} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06, duration: 0.45, ease: "easeOut" }}>{children}</motion.div>;
}
export function CountUp({ to, suffix = "" }: { to: number; suffix?: string }) {
  const v = useMotionValue(0); const t = useTransform(v, x => Math.round(x) + suffix);
  useEffect(() => { const c = animate(v, to, { duration: 0.9, ease: "easeOut" }); return () => c.stop(); }, [to, v]);
  return <motion.span>{t}</motion.span>;
}
