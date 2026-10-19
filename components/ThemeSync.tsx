"use client";
import { useEffect } from "react";
// Safety net: re-applies the saved theme after hydration (React can reset <html class> if hydration falls back to a client render),
// and writes the cookie once so later page loads are rendered with the right theme on the server.
export default function ThemeSync() {
  useEffect(() => { try {
    const m = document.cookie.match(/(?:^|; )theme=(dark|light)/); const saved = m?.[1] ?? localStorage.getItem("theme");
    const want = saved ?? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.classList.toggle("dark", want === "dark");
    if (!m) document.cookie = `theme=${want}; path=/; max-age=31536000; samesite=lax`;
  } catch {} }, []);
  return null;
}
