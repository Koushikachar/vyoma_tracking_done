import { pageGuard } from "@/lib/auth/guard"; import { getSettings } from "@/lib/settings"; import SettingsForm from "@/components/admin/SettingsForm";
export const dynamic = "force-dynamic";
export default async function P({ params }: { params: Promise<{ route: string }> }) { await pageGuard((await params).route, "settings");
  return <div className="p-5 md:p-8 mx-auto w-full max-w-6xl"><h1 className="text-3xl font-bold mb-6">Settings</h1><SettingsForm initial={await getSettings()} /></div>; }
