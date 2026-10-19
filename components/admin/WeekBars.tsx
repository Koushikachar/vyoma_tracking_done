"use client";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
const Pill = (p: any) => { const { x, y, width, height, payload, max } = p; const h = Math.max(height, 0); const base = y + h;
  if (!payload.lookups) return <rect x={x} y={base - 64} width={width} height={64} rx={width / 2} style={{ fill: "url(#hatch)", opacity: 0.8 }} />;
  const top = payload.lookups === max; return <rect x={x} y={y} width={width} height={Math.max(h, width)} rx={width / 2} style={{ fill: top ? "rgb(var(--brand))" : "rgb(var(--accent))", opacity: top ? 1 : 0.75 }} />; };
export default function WeekBars({ data }: { data: { day: string; lookups: number }[] }) {
  const max = Math.max(...data.map(d => d.lookups), 0);
  return (<div className="h-56" role="img" aria-label="Lookups per day, last 7 days"><ResponsiveContainer><BarChart data={data} barCategoryGap="22%" margin={{ top: 18 }}>
    <defs><pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" strokeWidth="2" style={{ stroke: "rgb(var(--muted))", opacity: 0.45 }} /></pattern></defs>
    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} /><Tooltip cursor={false} /><Bar dataKey="lookups" shape={(p: any) => <Pill {...p} max={max} />} /></BarChart></ResponsiveContainer></div>);
}
