import type { VyomaStatus } from "./types";
const R: [RegExp, VyomaStatus][] = [
  [/returned to (sender|shipper)|return(ed)? to origin delivered/i, "RETURNED"], [/return(ing)?\b|\brto\b/i, "RTO"],
  [/attempt|unable to deliver|undeliver|not home|no one available/i, "DELIVERY_ATTEMPTED"], [/out for delivery|on vehicle for delivery|with (the )?delivery (courier|agent)/i, "OUT_FOR_DELIVERY"],
  [/\bdelivered\b/i, "DELIVERED"], [/(arrived|arrival|reached).*(destination|delivery (facility|center|depot))|destination (facility|hub)/i, "AT_DESTINATION_HUB"],
  [/picked up|pick-?up (scan|complete)|collected/i, "PICKED_UP"], [/exception|delay|held|damag|customs|clearance|misroute|on hold/i, "EXCEPTION"],
  [/label created|information received|order (created|placed)|manifest|pre-?transit|info received/i, "ORDER_CREATED"], [/transit|depart|arriv|process|sort|facility|in progress/i, "IN_TRANSIT"]];
export const guess = (t?: string): VyomaStatus => R.find(([r]) => r.test(t ?? ""))?.[1] ?? "UNKNOWN"; // anything unmatched stays UNKNOWN, never guessed
export const place = (...p: (string | undefined)[]) => p.filter(Boolean).join(", ") || undefined;
