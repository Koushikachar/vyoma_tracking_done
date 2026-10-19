"use client";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
export default function LookupsChart({ data }: { data: { label: string; lookups: number; failures: number }[] }) {
  if (!data.length) return <p className="text-muted text-sm">No lookups in this period.</p>;
  return (<div className="h-64" role="img" aria-label="Lookups over time"><ResponsiveContainer><LineChart data={data}><CartesianGrid strokeOpacity={0.15} /><XAxis dataKey="label" tick={{ fontSize: 12 }} /><YAxis allowDecimals={false} /><Tooltip /><Legend />
    <Line type="monotone" dataKey="lookups" stroke="#22d3ee" strokeWidth={2} dot={false} /><Line type="monotone" dataKey="failures" stroke="#ef4444" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer></div>);
}
