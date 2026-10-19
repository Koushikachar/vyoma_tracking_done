export const EVENT_TEXT = { dispatched: "has been shipped", out_for_delivery: "is out for delivery today", attempt_failed: "could not be delivered", delivered: "has been delivered" } as const;
export type NotifyEvent = keyof typeof EVENT_TEXT;
// Which customer message (if any) a shipment status should trigger. Returns null when it is the same event as last time, so nothing is sent twice.
export function eventFor(status: string, lastEvent: string | null): NotifyEvent | null {
  const e: NotifyEvent | null = status === "PICKED_UP" ? "dispatched" : status === "OUT_FOR_DELIVERY" ? "out_for_delivery" : status === "DELIVERY_ATTEMPTED" || status === "EXCEPTION" ? "attempt_failed" : status === "DELIVERED" ? "delivered" : status === "IN_TRANSIT" && !lastEvent ? "dispatched" : null;
  return e && e !== lastEvent ? e : null;
}
