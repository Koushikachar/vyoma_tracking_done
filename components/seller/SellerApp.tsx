"use client";
import { fmtDate } from "@/lib/format";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Analytics from "@/components/seller/Analytics";
import Intelligence, { type View } from "@/components/seller/Intelligence";
import CodRecon from "@/components/seller/CodRecon";
import WeightTool from "@/components/seller/WeightTool";
import Team, { SetupChecklist } from "@/components/seller/Team";
import Mfa from "@/components/seller/Mfa";
import ApiKeys from "@/components/seller/ApiKeys";
import Activity from "@/components/seller/Activity";
import Recommend from "@/components/seller/Recommend";
import Notifications from "@/components/seller/Notifications";
import { canDo } from "@/lib/seller/roles";
import type { Role } from "@/lib/seller/roles";
import Connections from "@/components/seller/Connections";
import { cell } from "@/lib/seller/csv";
import Plans from "@/components/seller/Plans";
import LogoUpload from "@/components/seller/LogoUpload";
import type { Plan } from "@/lib/seller/plans";
import { Plus, Upload, Download, RefreshCw, LogOut, Search, Lock as LockIcon } from "lucide-react";
type Order = { id: string; orderNo: string; customerName: string | null; phone: string | null; pincode: string | null; paymentType: string; amount: number; awb: string | null; carrierCode: string | null; carrierName: string | null; shippedAt: string | null; deliveredAt: string | null; status: string; riskLevel: string; codStatus: string; riskReasons: string[]; createdAt: string };
type Case = { id: string; orderNo: string; customerName: string | null; phone: string | null; carrierCode: string | null; carrierName: string | null; courierAction: string | null; trackToken: string | null; status: string; reason: string | null; customerChoice: string | null; customerNote: string | null; createdAt: string; repliedAt: string | null };
type Brand = { brandName: string; brandColor: string; supportContact: string };
const CASE_LABEL: Record<string, string> = { OPEN: "Waiting for customer", CUSTOMER_REPLIED: "Customer replied", RESOLVED: "Resolved" };
const CHOICE: Record<string, string> = { REATTEMPT: "Please re-attempt delivery", UPDATE_ADDRESS: "Address needs correction", CANCEL: "Cancel the order" };
const FILTERS = [["ALL", "All"], ["NEW", "New"], ["IN_TRANSIT", "In transit"], ["NDR", "NDR"], ["DELIVERED", "Delivered"], ["RTO", "RTO"], ["HIGH", "High risk"]] as const;
const LABEL: Record<string, string> = { NEW: "New", IN_TRANSIT: "In transit", NDR: "Needs action (NDR)", DELIVERED: "Delivered", RTO: "Returned (RTO)" };
const STATUS_CLS: Record<string, string> = { NEW: "bg-line text-muted", IN_TRANSIT: "bg-brand/15 text-brand", NDR: "bg-amber-500/15 text-amber-600 dark:text-amber-400", DELIVERED: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400", RTO: "bg-red-500/15 text-red-500" };
const RISK_CLS: Record<string, string> = { LOW: "text-emerald-600 dark:text-emerald-400", MEDIUM: "text-amber-600 dark:text-amber-400", HIGH: "text-red-500" };
const KEYS: Record<string, string[]> = { orderNo: ["orderno", "order", "ordernumber", "orderid"], customerName: ["name", "customer", "customername"], phone: ["phone", "mobile", "contact"], pincode: ["pincode", "pin", "zip", "postcode"], paymentType: ["payment", "paymenttype", "mode"], amount: ["amount", "total", "value", "codamount"], awb: ["awb", "tracking", "trackingid", "trackingnumber"], carrierCode: ["carrier", "courier"], notifyOptIn: ["whatsappconsent", "consent", "optin", "notifyoptin"] };
function parseCsv(text: string) { // small CSV reader with quoted-field support
  const rows: string[][] = []; let cur = [""], q = false;
  for (let i = 0; i < text.length; i++) { const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cur[cur.length - 1] += '"'; i++; } else q = false; } else cur[cur.length - 1] += c; }
    else if (c === '"') q = true; else if (c === ",") cur.push(""); else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; rows.push(cur); cur = [""]; } else cur[cur.length - 1] += c; }
  rows.push(cur); const [h, ...b] = rows.filter(r => r.some(x => x.trim())); if (!h) return [];
  const idx = h.map(x => x.toLowerCase().replace(/[^a-z]/g, ""));
  return b.map(r => Object.fromEntries(Object.entries(KEYS).map(([k, alts]) => [k, r[idx.findIndex(x => alts.includes(x))]?.trim() ?? ""])));
}
const download = (name: string, text: string) => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type: "text/csv" })); a.download = name; a.click(); URL.revokeObjectURL(a.href); };
const q = cell;

export default function SellerApp({ name, orders, cases, brand: b0, merchantId, plan, planUntil, logoVersion, justPaid, waEnabled, conn, codSaved, weightSaved, wset, role, userName, ownerEmail, members, invites, pickups, seats, plans, rates, notifs, mfaEnabled, userEmail, waUsage, apiKeys, activity }: { waUsage: React.ComponentProps<typeof Notifications>["usage"]; apiKeys: React.ComponentProps<typeof ApiKeys>["keys"]; activity: React.ComponentProps<typeof Activity>["items"]; plans: React.ComponentProps<typeof Plans>["plans"]; rates: React.ComponentProps<typeof Recommend>["rates"]; notifs: React.ComponentProps<typeof Notifications>["items"]; mfaEnabled: boolean; userEmail: string; role: Role; userName: string; ownerEmail: string; members: React.ComponentProps<typeof Team>["members"]; invites: React.ComponentProps<typeof Team>["invites"]; pickups: React.ComponentProps<typeof Team>["pickups"]; seats: number; codSaved: React.ComponentProps<typeof CodRecon>["saved"]; weightSaved: React.ComponentProps<typeof WeightTool>["saved"]; wset: { divisor: number; slab: number; tolerance: number }; waEnabled: boolean; conn: { delhivery: boolean; woo: string | null; wooSynced: string | null }; name: string; orders: Order[]; cases: Case[]; brand: Brand; merchantId: string; plan: Plan; planUntil: string | null; logoVersion: number | null; justPaid: boolean }) {
  const r = useRouter(); const file = useRef<HTMLInputElement>(null);
  const [filter, setFilter] = useState<string>("ALL"); const [search, setSearch] = useState(""); const [adding, setAdding] = useState(false); const [view, setView] = useState<View>(justPaid ? "plans" : plan === "SCALE" ? "today" : "orders"); const [brand, setBrand] = useState(b0);
  const [busy, setBusy] = useState<string | null>(null); const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [f, setF] = useState({ orderNo: "", customerName: "", phone: "", pincode: "", paymentType: "COD", amount: "", awb: "", notifyOptIn: false });
  const count = (s: string) => orders.filter(o => s === "HIGH" ? o.riskLevel === "HIGH" : s === "ALL" ? true : o.status === s).length;
  const shown = useMemo(() => orders.filter(o => (filter === "ALL" || (filter === "HIGH" ? o.riskLevel === "HIGH" : o.status === filter))
    && (!search || [o.orderNo, o.customerName, o.awb, o.pincode].some(v => v?.toLowerCase().includes(search.toLowerCase())))), [orders, filter, search]);
  const post = async (url: string, b: object) => { const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(b) }); return res.json().catch(() => ({ success: false, error: { message: "Unexpected response." } })); };
  const send = async (rows: unknown[], label: string) => { setBusy("import"); const j = await post("/api/seller/orders", { action: "import", rows });
    setMsg(j.success ? { ok: true, text: `${label}: ${j.added} added${j.skipped ? `, ${j.skipped} skipped (duplicate or invalid)` : ""}.` } : { ok: false, text: j.error?.message ?? "Failed." }); setBusy(null); if (j.success) r.refresh(); return j.success; };
  const refresh = async (id: string) => { setBusy(id); const j = await post("/api/seller/orders", { action: "refresh", id }); setMsg(j.success ? { ok: true, text: `Status updated: ${LABEL[j.status] ?? j.status}.` } : { ok: false, text: j.error?.message ?? "Failed." }); setBusy(null); if (j.success) r.refresh(); };
  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => { const t = await e.target.files?.[0]?.text(); e.target.value = ""; if (!t) return; const rows = parseCsv(t); if (!rows.length) return setMsg({ ok: false, text: "That file has no rows." }); await send(rows, "CSV import"); };
  const rank = { FREE: 0, GROWTH: 1, SCALE: 2 }[plan]; const need: Record<string, number> = { today: 2, analytics: 1, cod: 2, weight: 2, ndr: 1, courier: 2 }; const locked = (v: string) => (need[v] ?? 0) > rank;
  const Gate = ({ v }: { v: string }) => <div className="rounded-2xl border border-dashed border-line p-10 text-center"><div className="text-lg font-semibold">Available on the {need[v] === 2 ? "Scale" : "Growth"} plan</div><p className="mt-1 text-sm text-muted">Upgrade to unlock this tab.</p><button onClick={() => setView("plans")} className="mt-4 h-11 rounded-xl bg-brand px-5 text-sm font-semibold text-bg">See plans</button></div>;
  const copy = async (t: string, ok: string) => { try { await navigator.clipboard.writeText(t); setMsg({ ok: true, text: ok }); } catch { setMsg({ ok: false, text: `Copy this link: ${t}` }); } };
  const link = async (id: string) => { const j = await post("/api/seller/orders", { action: "link", id }); if (j.success) copy(j.url, "Customer tracking link copied."); else setMsg({ ok: false, text: j.error?.message ?? "Failed." }); };
  const act = async (body: object, ok: string) => { const j = await post("/api/seller/orders", body); setMsg(j.success ? { ok: true, text: ok } : { ok: false, text: j.error?.message ?? "Failed." }); if (j.success) r.refresh(); };
  const phone10 = (p: string | null) => { const d = (p ?? "").replace(/\D/g, "").slice(-10); return d.length === 10 ? d : null; };
  const whatsapp = (c: Case) => { const d = phone10(c.phone); if (!d || !c.trackToken) return; const t = `Hi${c.customerName ? ` ${c.customerName.split(" ")[0]}` : ""}, we could not deliver your order ${c.orderNo}. Please tell us how to proceed: ${location.origin}/t/${c.trackToken}`; window.open(`https://wa.me/91${d}?text=${encodeURIComponent(t)}`, "_blank", "noopener"); };
  const openCases = cases.filter(c => c.status !== "RESOLVED"); const ordered = [...cases].sort((a, z) => Number(a.status === "RESOLVED") - Number(z.status === "RESOLVED"));
  const inp = "h-11 w-full min-w-0 rounded-xl border border-line bg-card px-3 text-sm text-fg outline-none placeholder:text-muted focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/30";
  const btn = "inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-line bg-card/70 px-3.5 text-sm font-medium transition hover:border-brand";
  const tiles = [["Total orders", count("ALL"), ""], ["In transit", count("IN_TRANSIT"), "text-brand"], ["Needs action", count("NDR"), "text-amber-500"], ["Delivered", count("DELIVERED"), "text-emerald-500"], ["Returned", count("RTO"), "text-red-500"], ["High-risk", count("HIGH"), "text-red-500"]] as const;
  const Badge = ({ o }: { o: Order }) => <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs ${STATUS_CLS[o.status] ?? STATUS_CLS.NEW}`}>{LABEL[o.status] ?? o.status}</span>;
  const Risk = ({ o }: { o: Order }) => <span title={o.riskReasons.join(" · ")} className={`text-xs font-semibold ${RISK_CLS[o.riskLevel]}`}>{o.riskLevel === "LOW" ? "Low" : o.riskLevel === "MEDIUM" ? "Medium" : "High"} risk{o.riskReasons.length > 0 && o.riskLevel !== "LOW" && <span className="mt-0.5 block text-[11px] font-normal text-muted">{o.riskReasons.slice(0, 2).join(" · ")}</span>}</span>;
  const Act = ({ o }: { o: Order }) => <span className="inline-flex flex-wrap items-center justify-end gap-x-3 gap-y-1">{o.awb ? <button disabled={busy === o.id} onClick={() => refresh(o.id)} className="inline-flex items-center gap-1.5 text-sm font-medium text-brand disabled:opacity-50"><RefreshCw size={14} className={busy === o.id ? "animate-spin" : ""} />Refresh</button> : <span className="text-xs text-muted">No AWB</span>}{o.paymentType === "COD" && o.codStatus === "NOT_SENT" && waEnabled && <button onClick={() => act({ action: "cod-verify", id: o.id }, "WhatsApp confirmation sent.")} className="text-sm font-medium text-brand">Verify COD</button>}{o.paymentType === "COD" && o.codStatus !== "NOT_SENT" && <span className={`text-xs ${o.codStatus === "CONFIRMED" ? "text-emerald-600 dark:text-emerald-400" : o.codStatus === "CANCELLED" ? "text-red-500" : "text-muted"}`}>COD {o.codStatus === "SENT" ? "awaiting reply" : o.codStatus.toLowerCase()}</span>}<button onClick={() => link(o.id)} className="text-sm font-medium text-muted hover:text-fg">Copy link</button></span>;

  return (<div className="space-y-6">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold sm:text-3xl">Seller workspace</h1><p className="text-sm text-muted">Welcome, {userName}. All your orders and shipments in one place.</p></div>
      <button onClick={async () => { await post("/api/seller/auth", { mode: "logout" }); window.location.assign("/seller/login"); }} className={btn}><LogOut size={16} />Sign out</button></header>

    {role === "VIEWER" && <p role="status" className="rounded-xl border border-line px-4 py-2.5 text-sm text-muted">You have read-only access. Ask the workspace owner if you need to make changes.</p>}
    <SetupChecklist go={setView} steps={[{ label: "Add a pickup location", done: pickups.length > 0, view: "team" }, { label: "Add or import your first orders", done: orders.length > 0, view: "orders" }, { label: "Set up your branded tracking page", done: !!(brand.brandName || brand.supportContact), view: "orders" }, { label: "Invite a teammate (optional)", done: members.length + invites.length > 0, view: "team" }]} />

    <div role="tablist" className="-mx-1 flex gap-1 overflow-x-auto border-b border-line px-1 text-sm">{([["today", "Today"], ["orders", "Orders"], ["ndr", `NDR inbox${openCases.length ? ` (${openCases.length})` : ""}`], ["analytics", "Analytics"], ["cod", "COD check"], ["weight", "Weight"], ["plans", "Plan & billing"], ["connections", "Connections"], ["team", "Team & setup"], ["courier", "Courier choice"], ["notifications", "Notifications"]] as const).map(([k, l]) => <button key={k} role="tab" aria-selected={view === k} onClick={() => setView(k)} className={`-mb-px shrink-0 whitespace-nowrap border-b-2 px-4 py-2.5 font-medium transition ${view === k ? "border-brand text-brand" : "border-transparent text-muted hover:text-fg"}`}>{l}{locked(k) && <LockIcon size={12} className="ml-1.5 inline opacity-60" aria-label="locked" />}</button>)}</div>
    {msg && view === "ndr" && <p role="status" className={`rounded-xl border px-4 py-2.5 text-sm ${msg.ok ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400" : "border-red-500/40 text-red-500"}`}>{msg.text}</p>}

    {view === "today" && (locked("today") ? <Gate v="today" /> : <Intelligence orders={orders} cases={cases} go={(v, f) => { setView(v); if (f) setFilter(f); }} />)}
    {view === "analytics" && (locked("analytics") ? <Gate v="analytics" /> : <Analytics orders={orders} cases={cases} />)}
    {view === "cod" && (locked("cod") ? <Gate v="cod" /> : <CodRecon orders={orders} saved={codSaved} />)}
    {view === "weight" && (locked("weight") ? <Gate v="weight" /> : <WeightTool saved={weightSaved} settings={wset} />)}
    {view === "team" && <div className="space-y-5"><Team role={role} ownerEmail={ownerEmail} members={members} invites={invites} pickups={pickups} seats={seats} /><Mfa enabled={mfaEnabled} />{canDo(role, "team.manage") && <Activity items={activity} />}</div>}
    {view === "courier" && (locked("courier") ? <Gate v="courier" /> : <Recommend rates={rates} orders={orders} canEdit={canDo(role, "records.write")} />)}
    {view === "notifications" && <Notifications items={notifs} usage={waUsage} />}
    {view === "connections" && <div className="space-y-5"><Connections conn={conn} /><ApiKeys keys={apiKeys} canEdit={canDo(role, "connections.write")} allowed={plan !== "FREE"} /></div>}
    {view === "plans" && <Plans plan={plan} until={planUntil} justPaid={justPaid} plans={plans} />}

    {view === "ndr" && locked("ndr") && <Gate v="ndr" />}
    {view === "ndr" && !locked("ndr") && <section className="space-y-3" aria-label="NDR inbox">
      <p className="text-sm text-muted">Failed deliveries appear here after you refresh a shipment. Send the customer their link, then arrange the re-attempt or address change in your courier&apos;s portal.</p>
      {!ordered.length ? <div className="rounded-2xl border border-dashed border-line p-10 text-center text-sm text-muted">No failed deliveries right now. 🎉</div> :
        <ul className="space-y-3">{ordered.map(c => <li key={c.id} className={`rounded-2xl border bg-card/70 p-4 backdrop-blur sm:p-5 ${c.status === "RESOLVED" ? "border-line opacity-70" : c.status === "CUSTOMER_REPLIED" ? "border-brand/50" : "border-amber-500/40"}`}>
          <div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><div className="font-semibold">{c.orderNo}<span className="ml-2 text-sm font-normal text-muted">{c.customerName ?? ""}</span></div><div className="text-xs text-muted">Opened {fmtDate(c.createdAt)}</div></div>
            <span className={`rounded-full px-2.5 py-0.5 text-xs ${c.status === "CUSTOMER_REPLIED" ? "bg-brand/15 text-brand" : c.status === "RESOLVED" ? "bg-line text-muted" : "bg-amber-500/15 text-amber-600 dark:text-amber-400"}`}>{CASE_LABEL[c.status]}</span></div>
          {c.reason && <p className="mt-3 text-sm"><span className="text-muted">Courier note: </span>{c.reason}</p>}
          {c.customerChoice && <div className="mt-3 rounded-xl bg-brand/10 p-3 text-sm"><div className="font-medium">{CHOICE[c.customerChoice]}</div>{c.customerNote && <p className="mt-1 whitespace-pre-wrap break-words text-muted">{c.customerNote}</p>}</div>}
          {c.status !== "RESOLVED" && <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={() => c.trackToken ? copy(`${location.origin}/t/${c.trackToken}`, "Customer link copied.") : setMsg({ ok: false, text: "Refresh this shipment once to create its customer link." })} className={btn}>Copy customer link</button>
            <button onClick={() => whatsapp(c)} disabled={!phone10(c.phone) || !c.trackToken} className={btn}>Message on WhatsApp</button>
            {c.courierAction && <span className="w-full text-xs text-emerald-600 dark:text-emerald-400">Courier request sent: {c.courierAction}</span>}
            {waEnabled && <button onClick={() => act({ action: "wa-ndr", id: c.id }, "WhatsApp message sent.")} className={btn}>Send WhatsApp (API)</button>}
            {(c.customerChoice === "REATTEMPT" || c.customerChoice === "UPDATE_ADDRESS") && /delhivery/i.test(`${c.carrierCode} ${c.carrierName}`) && (conn.delhivery ? <button onClick={() => act({ action: "courier-reattempt", id: c.id }, "Request sent to Delhivery.")} className={btn}>{c.customerChoice === "REATTEMPT" ? "Ask Delhivery to re-attempt" : "Send new address to Delhivery"}</button> : <button onClick={() => setView("connections")} className={btn}>Connect Delhivery to automate</button>)}
            <button onClick={() => act({ action: "resolve", id: c.id }, "Case marked as resolved.")} className={`${btn} border-emerald-500/40 text-emerald-600 dark:text-emerald-400`}>Mark resolved</button></div>}
        </li>)}</ul>}
    </section>}

    <div className={view === "orders" ? "space-y-6" : "hidden"}>

    <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">{tiles.map(([l, n, c]) => <div key={l} className="rounded-2xl border border-line bg-card/70 p-4 backdrop-blur"><div className="text-xs text-muted">{l}</div><div className={`mt-1 text-2xl font-bold ${c}`}>{n}</div></div>)}</section>

    <section className="flex flex-wrap gap-2">
      <button onClick={() => setAdding(a => !a)} className={`${btn} bg-brand text-bg hover:opacity-90 border-transparent`}><Plus size={16} />Add order</button>
      <button onClick={() => file.current?.click()} disabled={busy === "import"} className={btn}><Upload size={16} />Import CSV</button><input ref={file} type="file" accept=".csv,text/csv" hidden onChange={onFile} />
      <button onClick={() => download("vyoma-orders-template.csv", "order_no,customer_name,phone,pincode,payment_type,amount,awb,carrier,whatsapp_consent\nORD-1001,Asha Rao,9876543210,560001,COD,1499,,,yes\n")} className={btn}><Download size={16} />CSV template</button>
      <button onClick={() => download("vyoma-orders.csv", ["Order,Customer,Phone,Pincode,Payment,Amount,AWB,Status,Risk", ...shown.map(o => [o.orderNo, o.customerName, o.phone, o.pincode, o.paymentType, o.amount, o.awb, o.status, o.riskLevel].map(q).join(","))].join("\n"))} disabled={!shown.length} className={btn}><Download size={16} />Export</button>
    </section>
    {msg && <p role="status" className={`rounded-xl border px-4 py-2.5 text-sm ${msg.ok ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400" : "border-red-500/40 text-red-500"}`}>{msg.text}</p>}

    {adding && <form onSubmit={async e => { e.preventDefault(); if (await send([f], "Order")) { setF({ ...f, orderNo: "", customerName: "", phone: "", pincode: "", amount: "", awb: "" }); setAdding(false); } }} className="grid gap-3 rounded-2xl border border-line bg-card/70 p-4 backdrop-blur sm:grid-cols-2 lg:grid-cols-4">
      <input className={inp} placeholder="Order number *" required value={f.orderNo} onChange={e => setF({ ...f, orderNo: e.target.value })} />
      <input className={inp} placeholder="Customer name" value={f.customerName} onChange={e => setF({ ...f, customerName: e.target.value })} />
      <input className={inp} placeholder="Phone" inputMode="tel" value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} />
      <input className={inp} placeholder="Pincode" inputMode="numeric" maxLength={6} value={f.pincode} onChange={e => setF({ ...f, pincode: e.target.value })} />
      <select className={`field ${inp}`} aria-label="Payment" value={f.paymentType} onChange={e => setF({ ...f, paymentType: e.target.value })}><option value="COD">Cash on delivery</option><option value="PREPAID">Prepaid</option></select>
      <input className={inp} placeholder="Amount (₹)" inputMode="decimal" value={f.amount} onChange={e => setF({ ...f, amount: e.target.value })} />
      <input className={inp} placeholder="Tracking number (AWB)" value={f.awb} onChange={e => setF({ ...f, awb: e.target.value })} />
      <label className="flex items-center gap-2 text-sm text-muted sm:col-span-2"><input type="checkbox" checked={f.notifyOptIn} onChange={e => setF({ ...f, notifyOptIn: e.target.checked })} />Customer agreed to WhatsApp updates</label>
      <button disabled={busy === "import"} className="h-11 rounded-xl bg-brand font-semibold text-bg hover:opacity-90 disabled:opacity-50">Save order</button></form>}

    <section className="space-y-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div role="group" aria-label="Filter" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 text-sm">{FILTERS.map(([k, l]) => <button key={k} onClick={() => setFilter(k)} aria-pressed={filter === k} className={`shrink-0 whitespace-nowrap rounded-full border px-3.5 py-1.5 transition ${filter === k ? "border-brand/50 bg-brand/10 font-medium text-brand" : "border-line text-muted hover:text-fg"}`}>{l} <span className="opacity-60">{count(k)}</span></button>)}</div>
        <div className="relative lg:w-72"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" /><input className={`${inp} pl-9`} placeholder="Search order, name, AWB, pincode" aria-label="Search orders" value={search} onChange={e => setSearch(e.target.value)} /></div></div>

      {!shown.length ? <div className="rounded-2xl border border-dashed border-line p-10 text-center text-sm text-muted">{orders.length ? "No orders match this filter." : "No orders yet. Add one or import a CSV to get started."}</div> : <>
        <div className="hidden overflow-x-auto rounded-2xl border border-line bg-card/70 md:block"><table className="w-full text-left text-sm"><thead className="text-xs text-muted"><tr className="border-b border-line">{["Order", "Customer", "Payment", "AWB", "Status", "RTO risk", ""].map(h => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-line">{shown.map(o => <tr key={o.id} className="align-top"><td className="px-4 py-3 font-medium">{o.orderNo}<div className="text-xs font-normal text-muted">{fmtDate(o.createdAt)}</div></td>
            <td className="px-4 py-3">{o.customerName ?? "—"}<div className="text-xs text-muted">{[o.phone, o.pincode].filter(Boolean).join(" · ")}</div></td>
            <td className="px-4 py-3">{o.paymentType === "COD" ? "COD" : "Prepaid"}<div className="text-xs text-muted">₹{o.amount.toLocaleString("en-IN")}</div></td>
            <td className="px-4 py-3 font-mono text-xs">{o.awb ? <Link className="text-brand hover:underline" href={`/track/${encodeURIComponent(o.awb)}${o.carrierCode ? `?carrier=${o.carrierCode}` : ""}`} target="_blank">{o.awb}</Link> : "—"}</td>
            <td className="px-4 py-3"><Badge o={o} /></td><td className="px-4 py-3"><Risk o={o} /></td><td className="px-4 py-3 text-right"><Act o={o} /></td></tr>)}</tbody></table></div>
        <ul className="space-y-3 md:hidden">{shown.map(o => <li key={o.id} className="rounded-2xl border border-line bg-card/70 p-4 backdrop-blur"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="truncate font-semibold">{o.orderNo}</div><div className="truncate text-sm text-muted">{o.customerName ?? "No name"}{o.pincode ? ` · ${o.pincode}` : ""}</div></div><Badge o={o} /></div>
          <div className="mt-3 flex items-center justify-between text-sm"><span>{o.paymentType === "COD" ? "COD" : "Prepaid"} · ₹{o.amount.toLocaleString("en-IN")}</span><Risk o={o} /></div>
          <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3">{o.awb ? <Link className="min-w-0 truncate font-mono text-xs text-brand" href={`/track/${encodeURIComponent(o.awb)}${o.carrierCode ? `?carrier=${o.carrierCode}` : ""}`}>{o.awb}</Link> : <span className="text-xs text-muted">No AWB yet</span>}<Act o={o} /></div></li>)}</ul></>}
    </section>
    <details className="rounded-2xl border border-line bg-card/70 p-4 backdrop-blur sm:p-5"><summary className="cursor-pointer font-semibold">Branded tracking page</summary>
      <p className="mt-2 text-sm text-muted">Customers see this name, colour and support contact on the link you send them (use &quot;Copy link&quot; on any order).</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_auto_1fr_auto]">
        <input className={inp} placeholder={`Brand name (default: ${name})`} maxLength={60} value={brand.brandName} onChange={e => setBrand({ ...brand, brandName: e.target.value })} aria-label="Brand name" />
        <label className="flex h-11 items-center gap-2 rounded-xl border border-line bg-card px-3 text-sm text-muted">Colour<input type="color" value={brand.brandColor} onChange={e => setBrand({ ...brand, brandColor: e.target.value })} aria-label="Brand colour" className="h-7 w-10 cursor-pointer rounded border-0 bg-transparent p-0" /></label>
        <input className={inp} placeholder="Support email, phone or link" maxLength={120} value={brand.supportContact} onChange={e => setBrand({ ...brand, supportContact: e.target.value })} aria-label="Support contact" />
        <button disabled={plan === "FREE"} onClick={() => act({ action: "brand", ...brand }, "Brand settings saved.")} className="h-11 rounded-xl bg-brand px-5 text-sm font-semibold text-bg hover:opacity-90 disabled:opacity-40">Save</button></div>
      {plan === "FREE" && <p className="mt-2 text-xs text-muted">Branded tracking is part of the Growth plan.</p>}
      <LogoUpload merchantId={merchantId} version={logoVersion} allowed={plan !== "FREE"} /></details>
    </div>
  </div>);
}
