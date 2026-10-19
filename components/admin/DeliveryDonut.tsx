"use client";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
// Same full donut + legend in light and dark mode (colours are fixed hex values that read well on both).
export default function DeliveryDonut({ delivered, progress, issues }: { delivered: number; progress: number; issues: number }) {
  const total = delivered + progress + issues; const pct = total ? Math.round((delivered / total) * 100) : 0;
  const rows = [{ n: "Delivered", v: delivered, c: "#10b981" }, { n: "In progress", v: progress, c: "#5b50e6" }, { n: "Issues", v: issues, c: "#f59e0b" }];
  const data = total ? rows.filter(r => r.v > 0) : [{ n: "None", v: 1, c: "#94a3b840" }];
  return (<div className="mt-2">
    <div className="relative mx-auto h-44 w-44" role="img" aria-label={`${pct}% delivered`}>
      <ResponsiveContainer><PieChart><Pie data={data} dataKey="v" startAngle={90} endAngle={-270} innerRadius="72%" outerRadius="100%" paddingAngle={data.length > 1 ? 3 : 0} stroke="none" cornerRadius={8} isAnimationActive={false}>
        {data.map((d, i) => <Cell key={i} fill={d.c} />)}</Pie></PieChart></ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 grid place-items-center text-center"><div><div className="text-3xl font-bold leading-none">{pct}%</div><div className="mt-1 text-xs text-muted">Delivered</div></div></div>
    </div>
    <ul className="mt-5 space-y-2 text-sm">{rows.map(r => <li key={r.n} className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full" style={{ background: r.c }} /><span className="flex-1 text-muted">{r.n}</span>
      <b className="w-6 text-right">{r.v}</b><span className="w-10 text-right text-xs text-muted">{total ? Math.round((r.v / total) * 100) : 0}%</span></li>)}</ul>
  </div>);
}
