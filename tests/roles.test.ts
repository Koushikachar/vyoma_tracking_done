import { describe, it, expect } from "vitest";
import { canDo, assignable } from "@/lib/seller/roles";
describe("workspace roles", () => {
  it("owner can do everything, including billing", () => { for (const p of ["orders.write", "ndr.write", "records.write", "brand.write", "connections.write", "billing", "team.manage"] as const) expect(canDo("OWNER", p)).toBe(true); });
  it("only the owner can manage billing", () => { expect(canDo("ADMIN", "billing")).toBe(false); expect(canDo("FINANCE", "billing")).toBe(false); });
  it("read-only users can change nothing", () => { for (const p of ["orders.write", "ndr.write", "records.write", "brand.write", "connections.write", "billing", "team.manage"] as const) expect(canDo("VIEWER", p)).toBe(false); });
  it("operations handle orders and NDR but not money records or team", () => { expect(canDo("OPERATIONS", "orders.write")).toBe(true); expect(canDo("OPERATIONS", "ndr.write")).toBe(true); expect(canDo("OPERATIONS", "records.write")).toBe(false); expect(canDo("OPERATIONS", "team.manage")).toBe(false); });
  it("finance handles records only", () => { expect(canDo("FINANCE", "records.write")).toBe(true); expect(canDo("FINANCE", "orders.write")).toBe(false); });
  it("nobody can be given the OWNER role", () => { expect(assignable("OWNER", "OWNER")).toBe(false); expect(assignable("ADMIN", "OWNER")).toBe(false); });
  it("the owner can assign any of the four team roles", () => { for (const r of ["ADMIN", "OPERATIONS", "FINANCE", "VIEWER"]) expect(assignable("OWNER", r)).toBe(true); });
  it("an admin cannot create or change other admins", () => { expect(assignable("ADMIN", "ADMIN")).toBe(false); expect(assignable("ADMIN", "VIEWER")).toBe(true); });
  it("lower roles cannot assign anything", () => { for (const a of ["OPERATIONS", "FINANCE", "VIEWER"] as const) expect(assignable(a, "VIEWER")).toBe(false); });
  it("an unknown role has no permissions", () => expect(canDo("HACKER" as any, "orders.write")).toBe(false));
});
