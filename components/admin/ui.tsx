export const panel = "rounded-3xl border border-line bg-card/80 backdrop-blur";
export function PageHeader({ title, sub, children }: { title: string; sub?: string; children?: React.ReactNode }) {
  return <div className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-3xl font-bold">{title}</h1>{sub && <p className="text-muted text-sm mt-1 max-w-2xl">{sub}</p>}</div>{children}</div>;
}
const T = { ok: "bg-brand/15 text-brand", warn: "bg-amber-500/15 text-amber-600", bad: "bg-red-500/15 text-red-500", mute: "bg-line text-muted" } as const;
export function Badge({ tone = "mute", children }: { tone?: keyof typeof T; children: React.ReactNode }) { return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${T[tone]}`}>{children}</span>; }
