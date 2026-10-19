// All dashboard day/hour grouping and display uses the configured time zone (default Asia/Kolkata), not UTC.
export const validTz = (tz: string) => { try { new Intl.DateTimeFormat("en", { timeZone: tz }); return true; } catch { return false; } };
const part = (d: Date, tz: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-CA", { timeZone: tz, ...o }).format(d);
export const dayKey = (d: Date, tz: string) => part(d, tz, { year: "numeric", month: "2-digit", day: "2-digit" }); // YYYY-MM-DD
export const bucketKey = (d: Date, tz: string, hourly: boolean) => hourly ? `${dayKey(d, tz)}T${part(d, tz, { hour: "2-digit", hourCycle: "h23" })}` : dayKey(d, tz);
export const weekdayLetter = (d: Date, tz: string) => new Intl.DateTimeFormat("en", { timeZone: tz, weekday: "narrow" }).format(d);
export const fmt = (d: Date, tz: string) => d.toLocaleString("en-IN", { timeZone: tz, dateStyle: "medium", timeStyle: "short" });
