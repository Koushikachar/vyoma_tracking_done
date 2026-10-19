// Plan limits and prices (₹ per 30 days). These mirror the blueprint's proposed tiers; change them here only.
export const PLANS = {
  FREE: { label: "Free", price: 0, orders: 100, seats: 1 },
  GROWTH: { label: "Growth", price: 999, orders: 2000, seats: 3 },
  SCALE: { label: "Scale", price: 2999, orders: 50000, seats: 10 },
} as const;
export type Plan = keyof typeof PLANS;
// A paid plan only counts while it has not expired; afterwards the account falls back to Free (data is kept).
export const activePlan = (m: { plan: string; planUntil: Date | null }): Plan =>
  (m.plan in PLANS && m.plan !== "FREE" && m.planUntil && m.planUntil > new Date() ? m.plan : "FREE") as Plan;

const EXTRA: Record<Plan, string[]> = {
  FREE: ["Order dashboard and CSV import", "Live tracking and RTO risk labels"],
  GROWTH: ["Branded tracking page and logo", "NDR inbox with customer links", "Courier analytics", "Shipment status notifications"],
  SCALE: ["Daily action list", "COD reconciliation and weight checks", "Courier comparison from your own rate cards"],
};
export const planFeatures = (k: Plan, i: { orders: number; seats: number }) => [`Up to ${i.orders.toLocaleString("en-IN")} orders`, i.seats === 1 ? "Just you (1 seat)" : `${i.seats} team seats`, ...EXTRA[k]];
