"use client";
import { useRouter } from "next/navigation";
export default function Replay({ id }: { id: string }) { const r = useRouter();
  return <button className="text-brand" onClick={async () => { await fetch("/api/control/webhooks", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id }) }); r.refresh(); }}>Replay</button>; }
