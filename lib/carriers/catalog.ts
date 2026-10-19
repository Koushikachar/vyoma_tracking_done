// Single source of truth for carriers. "direct" = own adapter + key. "ship24" = no adapter of its own: looked up through Ship24, which detects the courier.
// Portal links and steps come from memory: verify on the linked site. Direct keys only see shipments booked on YOUR account with that carrier (except DHL/FedEx/UPS).
export type CatalogItem = { code: string; name: string; kind: "direct" | "ship24"; docs: string; steps: string };
const via = (code: string, name: string, docs: string, extra = ""): CatalogItem => ({ code, name, kind: "ship24", docs,
  steps: `No open public tracking API confirmed for ${name}. Customers' ${name} numbers are looked up through Ship24: add a Ship24 key and test a real number, since coverage isn't guaranteed. For direct access, ask your ${name} account manager for API credentials and documentation.${extra}` });
export const CATALOG: CatalogItem[] = [
  { code: "ship24", name: "Ship24 (any carrier)", kind: "direct", docs: "https://docs.ship24.com", steps: "Create an account at ship24.com, open the dashboard's API section, create an API key and paste it above. Ship24 detects the courier itself, so it also works for Indian and local couriers and for parcels that are not on your account. The free plan is small (about 10 shipments): check the pricing page." },
  { code: "delhivery", name: "Delhivery", kind: "direct", docs: "https://one.delhivery.com/developer-portal", steps: "Needs a Delhivery business (client) account. Open the Developer Portal / API settings and copy your API token, or ask your account manager to enable API access. Only your own account's waybills can be tracked." },
  { code: "dhl", name: "DHL", kind: "direct", docs: "https://developer.dhl.com", steps: "Register at developer.dhl.com, create an app subscribed to Shipment Tracking - Unified, and request access if it asks. Copy the API key and paste it above (the secret isn't used). The free limit is about 250 calls a day." },
  { code: "fedex", name: "FedEx", kind: "direct", docs: "https://developer.fedex.com", steps: "Create a FedEx Developer account and a project with the Track API. Save the API key and secret here as KEY:SECRET (a colon between). Production use needs project approval." },
  { code: "ups", name: "UPS", kind: "direct", docs: "https://developer.ups.com", steps: "Create an app in the UPS Developer Portal with the Tracking API. Save its client ID and secret here as CLIENT_ID:CLIENT_SECRET (a colon between)." },
  via("bluedart", "Blue Dart", "https://www.bluedart.com", " Needs a Blue Dart business account."),
  via("dtdc", "DTDC", "https://www.dtdc.in", " Needs a DTDC customer account."),
  via("ecomexpress", "Ecom Express", "https://www.ecomexpress.in"),
  via("xpressbees", "Xpressbees", "https://www.xpressbees.com"),
  via("shadowfax", "Shadowfax", "https://www.shadowfax.in", " Shadowfax's own API is for merchants who book through it."),
  via("ekart", "Ekart", "https://ekartlogistics.com", " The only Ekart endpoint found online is an undocumented website call that needs spoofed browser headers (scraping), so it is not used."),
  via("indiapost", "India Post / Speed Post", "https://www.indiapost.gov.in", " India Post has no open tracking API for third parties."),
  via("gati", "Gati", "https://www.gati.com"),
  via("trackon", "Trackon", "https://www.trackoncourier.com"),
  via("professional", "Professional Couriers", "https://www.tpcindia.com"),
  via("stcourier", "ST Courier", "https://www.stcourier.com"),
  via("safexpress", "Safexpress", "https://www.safexpress.com"),
];
