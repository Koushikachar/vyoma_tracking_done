import { pageGuard } from "@/lib/auth/guard";
import { getPlans } from "@/lib/seller/plans-db";
import PlansAdmin from "@/components/admin/PlansAdmin";
export const dynamic = "force-dynamic";
export default async function P({ params }: { params: Promise<{ route: string }> }) {
  await pageGuard((await params).route, "sellers"); const plans = await getPlans();
  return <div className="p-5 md:p-8 mx-auto w-full max-w-5xl"><h1 className="text-3xl font-bold">Plans</h1><p className="mt-1 mb-6 text-sm text-muted">Prices and limits for the seller plans. Changes apply to new orders, invites and payments straight away.</p><PlansAdmin plans={plans} /></div>;
}
