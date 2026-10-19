"use client";
import { fmtDateTime } from "@/lib/format";
import { motion } from "framer-motion";
import { Package, Truck, Warehouse, Bike, CheckCircle2, AlertTriangle, Undo2, HelpCircle, ClipboardList, XCircle } from "lucide-react";
const icon: Record<string, any> = { ORDER_CREATED: ClipboardList, PICKED_UP: Package, IN_TRANSIT: Truck, AT_DESTINATION_HUB: Warehouse,
  OUT_FOR_DELIVERY: Bike, DELIVERED: CheckCircle2, DELIVERY_ATTEMPTED: XCircle, EXCEPTION: AlertTriangle, RTO: Undo2, RETURNED: Undo2, UNKNOWN: HelpCircle };
const label = (s: string) => s.replace(/_/g, " ").toLowerCase().replace(/^\w/, c => c.toUpperCase());
export default function Timeline({ events, showRaw }: { events: any[]; showRaw?: boolean }) {
  const list = [...events].reverse();
  return (<ol className="relative border-l border-line ml-4 space-y-6">{list.map((e, i) => { const I = icon[e.status] ?? HelpCircle;
    return (<motion.li key={i} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }} className="pl-8 relative">
      <span className={`absolute -left-4 top-0 grid place-items-center w-8 h-8 rounded-full border border-line bg-card ${i === 0 ? "text-brand ring-2 ring-brand/40" : "text-muted"}`}><I size={16} /></span>
      <div className="font-semibold">{label(e.status)}</div>
      <div className="text-sm text-muted">{e.location} · {fmtDateTime(e.eventTime)}</div>
      {showRaw && <div className="text-xs text-muted mt-1 font-mono">{e.rawStatus}: {e.description}</div>}
    </motion.li>); })}</ol>);
}
