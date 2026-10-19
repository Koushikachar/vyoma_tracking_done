"use client";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
const C = ["#22d3ee", "#6366f1", "#a78bfa", "#34d399", "#fbbf24", "#10b981", "#f97316", "#ef4444", "#f472b6", "#94a3b8", "#64748b"];
export default function StatusChart({ data }: { data: { name: string; value: number }[] }) {
  if (!data.length) return <p className="text-muted text-sm">No shipments yet. Run <code>npm run seed</code> or track one.</p>;
  return (<div className="grid md:grid-cols-2 gap-6 h-72" role="img" aria-label="Shipments by status">
    <ResponsiveContainer><BarChart data={data} layout="vertical" margin={{ left: 20 }}><XAxis type="number" allowDecimals={false} /><YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 12 }} /><Tooltip /><Bar dataKey="value" radius={4}>{data.map((_, i) => <Cell key={i} fill={C[i % C.length]} />)}</Bar></BarChart></ResponsiveContainer>
    <ResponsiveContainer><PieChart><Pie data={data} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="85%" paddingAngle={2}>{data.map((_, i) => <Cell key={i} fill={C[i % C.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div>);
}
