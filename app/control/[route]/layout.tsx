import Sidebar from "@/components/admin/Sidebar";
import { getSession } from "@/lib/auth/session";
import { can } from "@/lib/auth/rbac";
export const metadata = { robots: { index: false, follow: false } };
const NAV: [string, string, any][] = [["dashboard", "Dashboard", "dashboard"], ["shipments", "Shipments", "shipments.read"], ["sellers", "Sellers", "sellers"], ["plans", "Plans", "sellers"], ["jobs", "Jobs", "sellers"], ["tracking-lab", "Tracking Lab", "shipments"], ["integrations", "Integrations", "carriers"],
  ["carrier-health", "Carrier Health", "carriers"], ["api-keys", "API Keys", "apikeys"], ["webhooks", "Webhooks", "webhooks"], ["users", "Users", "users"], ["settings", "Settings", "settings"],
  ["contact-messages", "Contact Messages", "contact"], ["audit-logs", "Audit Logs", "logs"], ["security", "Security", ""]];
export default async function AdminLayout({ children, params }: { children: React.ReactNode; params: Promise<{ route: string }> }) {
  const { route } = await params; const s = await getSession();
  if (!s) return <div className="admin min-h-screen bg-bg text-fg">{children}</div>;
  return (<div className="admin min-h-screen bg-bg text-fg md:flex"><Sidebar route={route} email={s.user.email} role={s.user.role} items={NAV.filter(([, , p]) => !p || can(s.user.role, p)).map(([h, l]) => [h, l])} />
    <div className="flex-1 min-w-0 pb-28 md:pb-0">{children}</div></div>);
}
