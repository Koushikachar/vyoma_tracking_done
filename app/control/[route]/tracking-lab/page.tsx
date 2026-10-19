import { pageGuard } from "@/lib/auth/guard"; import Lab from "@/components/admin/Lab";
export default async function P({ params }: { params: Promise<{ route: string }> }) { await pageGuard((await params).route, "shipments");
  return <div className="p-5 md:p-8 mx-auto w-full max-w-5xl"><h1 className="text-3xl font-bold mb-6">Tracking Lab</h1><Lab /></div>; }
