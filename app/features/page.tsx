import type { Metadata } from "next";
export const metadata: Metadata = { title: "Features", description: "What Vyoma Route does for e-commerce sellers." };
const F: [string, string, string][] = [
  ["Unified order dashboard", "Add orders by hand or import a CSV, see every order and its latest courier status in one place, filter, search and export.", "Available"],
  ["Live shipment tracking", "Look up a tracking number through connected tracking services. Status is shown with its last-updated time, never presented as live when it is not.", "Available (needs a tracking-service key)"],
  ["RTO risk labels", "Simple, explainable rules rate each order Low, Medium or High risk and tell you why.", "Available"],
  ["NDR inbox", "Failed deliveries become cases. Send the customer a link to ask for another attempt or a corrected address, and track the case to resolution.", "Available"],
  ["Branded tracking page", "A tracking page with your name, colour, logo and support contact, behind a private link.", "Available (Growth plan)"],
  ["Courier analytics", "Delivery, RTO and NDR rates and transit times by courier, with sample sizes shown.", "Available (Growth plan)"],
  ["COD reconciliation and weight checks", "Match courier COD settlement files to your orders, and check billed weight against your declared sizes.", "Available (Scale plan)"],
  ["Daily action list", "A prioritised list of what needs attention today, built from your own data.", "Available (Scale plan)"],
  ["WhatsApp COD confirmation and NDR messages", "Template messages through the official WhatsApp Business Platform.", "Needs WhatsApp account and approved templates"],
  ["Courier re-attempt (Delhivery)", "Ask Delhivery to re-attempt or fix an address from the NDR inbox using your own Delhivery token.", "Delhivery only, for now"],
  ["WooCommerce import", "Connect a store with read-only keys and import new orders.", "Available"],
];
export default function Features() {
  return (<main className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20"><h1 className="text-4xl font-bold sm:text-5xl">Features</h1><p className="mt-3 max-w-2xl text-muted">Everything below is labelled with what it needs, so you know what works today.</p>
    <div className="mt-10 grid gap-4 sm:grid-cols-2">{F.map(([t, d, s]) => <div key={t} className="rounded-2xl border border-line bg-card/70 p-5"><h2 className="font-semibold">{t}</h2><p className="mt-1.5 text-sm text-muted">{d}</p><span className="mt-3 inline-block rounded-full bg-line px-2.5 py-0.5 text-xs text-muted">{s}</span></div>)}</div></main>);
}
