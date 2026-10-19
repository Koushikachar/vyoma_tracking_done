import { redirect } from "next/navigation";
import { getSession } from "./session";
import { can, Perm } from "./rbac";
export async function pageGuard(route: string, perm: Perm) {
  const s = await getSession(); if (!s) redirect(`/control/${route}/login`);
  if (!can(s.user.role, perm)) redirect(`/control/${route}/dashboard`);
  return s;
}
