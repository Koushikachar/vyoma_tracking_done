// Architecture only: no provider is wired and no preference UI exists yet, so nothing here pretends to send.
export const CHANNELS = ["email", "sms", "whatsapp", "push"] as const;
export const NOTIFY_EVENTS = ["PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED", "EXCEPTION", "RTO"] as const;
export type Channel = typeof CHANNELS[number]; export type NotifyEvent = typeof NOTIFY_EVENTS[number];
export interface NotificationProvider { channel: Channel; send(to: string, event: NotifyEvent, trackingId: string): Promise<void>; }
export const providers: NotificationProvider[] = []; // add providers here; record attempts in the Notification table
