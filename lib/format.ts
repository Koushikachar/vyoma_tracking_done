// Dates shown on screen. The server (Vercel runs in UTC) and the visitor's browser must produce the SAME text, otherwise React reports
// "Hydration failed" (error #418). So the time zone is fixed to India and the text is built by hand from numbers, not from the
// browser's locale rules (which differ between Node and each browser).
const TZ = "Asia/Kolkata";
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const fmt = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "2-digit", hourCycle: "h23" });
function parts(v: string | number | Date) { const d = new Date(v); if (Number.isNaN(+d)) return null; return Object.fromEntries(fmt.formatToParts(d).map(p => [p.type, p.value])) as Record<string, string>; }
export const fmtDate = (v: string | number | Date) => { const p = parts(v); return p ? `${+p.day} ${MON[+p.month - 1]} ${p.year}` : "—"; };
export const fmtDateTime = (v: string | number | Date) => { const p = parts(v); return p ? `${+p.day} ${MON[+p.month - 1]} ${p.year}, ${+p.hour % 12 || 12}:${p.minute} ${+p.hour < 12 ? "am" : "pm"}` : "—"; };
