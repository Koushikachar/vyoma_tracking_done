import { TrackingError } from "./types";
// Shared carrier HTTP call: timeouts and HTTP errors become safe VYOMA errors (details stay internal).
export async function http(url: string, init: RequestInit = {}, timeoutMs = 8000): Promise<any> {
  let res: Response;
  try { res = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs), cache: "no-store" }); } catch { throw new TrackingError("PROVIDER_UNAVAILABLE", 504, "network/timeout"); }
  if (res.status === 404) throw new TrackingError("SHIPMENT_NOT_FOUND", 404);
  if (res.status === 429) throw new TrackingError("RATE_LIMITED", 429);
  if (!res.ok) throw new TrackingError("PROVIDER_UNAVAILABLE", 503, `HTTP ${res.status}`); // 401/403/5xx
  return res.json().catch(() => { throw new TrackingError("PROVIDER_UNAVAILABLE", 502, "bad json"); });
}
