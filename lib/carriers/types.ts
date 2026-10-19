export const STATUSES = ["ORDER_CREATED","PICKED_UP","IN_TRANSIT","AT_DESTINATION_HUB","OUT_FOR_DELIVERY","DELIVERED","DELIVERY_ATTEMPTED","EXCEPTION","RTO","RETURNED","UNKNOWN"] as const;
export type VyomaStatus = typeof STATUSES[number];

export type ErrorCode = "INVALID_TRACKING_ID"|"CARRIER_REQUIRED"|"UNSUPPORTED_CARRIER"|"SHIPMENT_NOT_FOUND"|"PROVIDER_UNAVAILABLE"|"RATE_LIMITED"|"INTERNAL_ERROR";

export class TrackingError extends Error {
  constructor(public code: ErrorCode, public http: number, public internal?: string) { super(code); }
}
export const SAFE_MESSAGES: Record<ErrorCode,string> = {
  INVALID_TRACKING_ID: "Tracking ID looks invalid.",
  CARRIER_REQUIRED: "We couldn't identify the carrier. Please select one.",
  UNSUPPORTED_CARRIER: "This carrier is not supported or not configured.",
  SHIPMENT_NOT_FOUND: "Shipment could not be found.",
  PROVIDER_UNAVAILABLE: "Carrier service is temporarily unavailable. Please try again shortly.",
  RATE_LIMITED: "Too many requests. Please try again later.",
  INTERNAL_ERROR: "Something went wrong.",
};

export interface DetectionResult { carrier: string; confidence: number }
export interface RawTrackingResult { carrier: string; payload: unknown; latencyMs: number }
export interface NormalizedEvent { eventTime: string; status: VyomaStatus; rawStatus: string; description?: string; location?: string; source: string }
export interface NormalizedShipment {
  trackingId: string; carrier: { code: string; name: string };
  currentStatus: VyomaStatus; currentStatusRaw: string; lastUpdatedAt: string;
  estimatedDeliveryAt?: string; origin?: string; destination?: string; events: NormalizedEvent[];
}
export interface HealthCheckResult { status: "HEALTHY"|"DEGRADED"|"DOWN"|"NOT_CONFIGURED"; latencyMs?: number }

export interface CarrierAdapter {
  code: string; name: string;
  timeoutMs?: number; // overall lookup budget; defaults to 8s (Ship24 needs longer)
  isConfigured(): boolean;
  detect(trackingId: string): Promise<DetectionResult>;
  fetchTracking(trackingId: string): Promise<RawTrackingResult>;
  normalize(raw: RawTrackingResult, trackingId: string): NormalizedShipment;
  healthCheck(): Promise<HealthCheckResult>;
}
