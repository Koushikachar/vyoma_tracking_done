// Small CSV reader (quoted fields supported). Returns one object per row, keyed by the header with all non-letters removed and lower-cased.
export function readCsv(text: string): Record<string, string>[] {
  const rows: string[][] = []; let cur = [""], q = false;
  for (let i = 0; i < text.length; i++) { const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cur[cur.length - 1] += '"'; i++; } else q = false; } else cur[cur.length - 1] += c; }
    else if (c === '"') q = true; else if (c === ",") cur.push(""); else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; rows.push(cur); cur = [""]; } else cur[cur.length - 1] += c; }
  rows.push(cur); const [h, ...b] = rows.filter(r => r.some(x => x.trim())); if (!h) return [];
  const keys = h.map(x => x.toLowerCase().replace(/[^a-z]/g, ""));
  return b.map(r => Object.fromEntries(keys.map((k, i) => [k, (r[i] ?? "").trim()])));
}
export const pick = (r: Record<string, string>, alts: string[]) => { for (const a of alts) if (r[a]) return r[a]; return ""; };
export const num = (v: string) => { const n = parseFloat(v.replace(/[₹,\s]/g, "")); return Number.isFinite(n) ? n : NaN; };
export const csvOut = (name: string, lines: string[]) => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" })); a.download = name; a.click(); URL.revokeObjectURL(a.href); };
// Text starting with = + - @ would run as a formula when the CSV is opened in Excel/Sheets, so it is prefixed with an apostrophe (numbers are left alone).
export const cell = (v: unknown) => { let s = String(v ?? ""); if (typeof v === "string" && /^[=+\-@\t\r]/.test(s)) s = "'" + s; return `"${s.replace(/"/g, '""')}"`; };
