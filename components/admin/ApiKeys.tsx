"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export default function ApiKeys({ keys }: { keys: { id: string; name: string; prefix: string; lastUsedAt: string | null; revoked: boolean }[] }) {
  const r = useRouter(); const [name, setName] = useState(""); const [fresh, setFresh] = useState("");
  const j = (m: string, b: object) => fetch("/api/control/apikeys", { method: m, headers: { "content-type": "application/json" }, body: JSON.stringify(b) }).then(x => x.json());
  return (<div className="space-y-6"><div className="flex gap-2"><input value={name} onChange={e => setName(e.target.value)} placeholder="Key name" className="rounded-xl border border-line bg-transparent px-3 py-2" />
    <button disabled={name.length < 2} onClick={async () => { const d = await j("POST", { name }); if (d.success) { setFresh(d.key); setName(""); r.refresh(); } }} className="rounded-xl bg-brand text-bg px-4 py-2 font-semibold disabled:opacity-50">Create key</button></div>
    {fresh && <div role="alert" className="rounded-xl border border-brand p-4 text-sm">Copy now, it won’t be shown again:<div className="font-mono break-all mt-2">{fresh}</div></div>}
    <table className="w-full text-sm"><tbody>{keys.map(k => <tr key={k.id} className="border-t border-line"><td className="py-2">{k.name}</td><td className="font-mono">{k.prefix}…</td><td>{k.lastUsedAt ?? "never used"}</td>
      <td>{k.revoked ? "Revoked" : <button className="text-red-500" onClick={async () => { await j("DELETE", { id: k.id }); r.refresh(); }}>Revoke</button>}</td></tr>)}</tbody></table></div>);
}
