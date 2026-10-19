import type { Metadata } from "next";
export const metadata: Metadata = { title: "Integrations", description: "Which services Vyoma Route connects to, and what each needs." };
const G: [string, [string, string][]][] = [
  ["Tracking", [["Ship24 (many couriers)", "Needs a Ship24 key and plan"], ["Delhivery", "Needs a Delhivery API token"], ["DHL, FedEx, UPS", "Need each carrier's developer credentials"], ["Other Indian couriers", "Through Ship24 coverage; not guaranteed for every courier"]]],
  ["Courier actions", [["Delhivery re-attempt / address change", "Needs the seller's own Delhivery token"], ["Other couriers", "Not available yet. Handle manually in the courier's portal"]]],
  ["Messaging", [["WhatsApp Business Platform", "Needs a Meta account, number and approved templates"], ["Email (SMTP)", "Used for account and password emails"]]],
  ["Stores", [["WooCommerce", "Read-only API keys from the store"], ["Shopify", "Planned, not available yet"]]],
  ["Payments", [["Razorpay", "Needs Razorpay account and webhook set-up"]]],
];
export default function Integrations() {
  return (<main className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20"><h1 className="text-4xl font-bold sm:text-5xl">Integrations</h1><p className="mt-3 max-w-2xl text-muted">An integration is only live once it has been configured and tested with real credentials. We do not claim coverage we cannot deliver.</p>
    <div className="mt-10 space-y-8">{G.map(([h, rows]) => <section key={h}><h2 className="text-lg font-semibold">{h}</h2><ul className="mt-3 divide-y divide-line rounded-2xl border border-line bg-card/70">{rows.map(([n, s]) => <li key={n} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"><span className="font-medium">{n}</span><span className="text-muted">{s}</span></li>)}</ul></section>)}</div></main>);
}
