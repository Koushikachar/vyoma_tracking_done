// Workspace roles. OWNER is the person who created the workspace; everyone else is a TeamMember. Enforced on the server in every seller API.
export type Role = "OWNER" | "ADMIN" | "OPERATIONS" | "FINANCE" | "VIEWER";
export type Perm = "orders.write" | "ndr.write" | "records.write" | "brand.write" | "connections.write" | "billing" | "team.manage";
const MAP: Record<Role, Perm[]> = {
  OWNER: ["orders.write", "ndr.write", "records.write", "brand.write", "connections.write", "billing", "team.manage"],
  ADMIN: ["orders.write", "ndr.write", "records.write", "brand.write", "connections.write", "team.manage"],
  OPERATIONS: ["orders.write", "ndr.write"], FINANCE: ["records.write"], VIEWER: [],
};
export const canDo = (r: Role, p: Perm) => MAP[r]?.includes(p) ?? false;
export const INVITABLE = ["ADMIN", "OPERATIONS", "FINANCE", "VIEWER"] as const;
// Who may give or change which role: the owner can manage everyone, an admin only the three lower roles, nobody else anyone.
export const assignable = (actor: Role, target: string) => actor === "OWNER" ? (INVITABLE as readonly string[]).includes(target) : actor === "ADMIN" ? ["OPERATIONS", "FINANCE", "VIEWER"].includes(target) : false;
export const ROLE_LABEL: Record<string, string> = { OWNER: "Owner", ADMIN: "Admin", OPERATIONS: "Operations", FINANCE: "Finance", VIEWER: "Read-only" };
