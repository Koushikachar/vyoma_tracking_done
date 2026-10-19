export type Role = "SUPER_ADMIN" | "ADMIN" | "SUPPORT" | "ANALYST";
export type Perm = "dashboard" | "shipments" | "shipments.read" | "carriers" | "apikeys" | "webhooks" | "logs" | "settings" | "analytics" | "users" | "contact" | "sellers";
const MAP: Record<Role, Perm[] | "*"> = {
  SUPER_ADMIN: "*",
  ADMIN: ["dashboard", "shipments", "shipments.read", "carriers", "apikeys", "webhooks", "logs", "settings", "contact", "sellers"],
  SUPPORT: ["shipments", "shipments.read", "contact"],
  ANALYST: ["analytics", "shipments.read"],
};
export const can = (role: Role, p: Perm) => MAP[role] === "*" || (MAP[role] as Perm[]).includes(p);
