// Client-side theme helper. The choice is kept in a cookie (so the server renders the right class on the very first paint,
// even after a refresh) and in localStorage (fallback).
export function setTheme(dark: boolean) {
  document.documentElement.classList.toggle("dark", dark);
  try { localStorage.setItem("theme", dark ? "dark" : "light"); } catch {}
  document.cookie = `theme=${dark ? "dark" : "light"}; path=/; max-age=31536000; samesite=lax`;
}
