// Rule-based, explainable RTO risk. Only order-quality signals (no demographics); every point comes with a reason the seller can see.
export function assessRisk(o: { paymentType: string; amount: number; phone?: string | null; pincode?: string | null }) {
  const reasons: string[] = []; let score = 0;
  if (!/^[1-9]\d{5}$/.test(o.pincode ?? "")) { score += 3; reasons.push("Pincode missing or invalid"); }
  if (!/^(\+?91)?[6-9]\d{9}$/.test((o.phone ?? "").replace(/[\s-]/g, ""))) { score += 2; reasons.push("Phone number looks invalid"); }
  if (o.paymentType === "COD") { score += 1; reasons.push("Cash on delivery"); if (o.amount >= 3000) { score += 2; reasons.push("High COD value (₹3,000+)"); } }
  return { level: score >= 4 ? "HIGH" : score >= 2 ? "MEDIUM" : "LOW", reasons };
}
// Map Vyoma's detailed carrier status to the seller's simple buckets.
export const bucket = (s: string) => s === "DELIVERED" ? "DELIVERED" : ["RTO", "RETURNED"].includes(s) ? "RTO" : ["EXCEPTION", "DELIVERY_ATTEMPTED"].includes(s) ? "NDR" : "IN_TRANSIT";
