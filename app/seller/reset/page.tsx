import TokenForm from "@/components/seller/TokenForm";
export const metadata = { title: "Choose a new password", robots: { index: false } };
export default async function Page({ searchParams }: { searchParams: Promise<{ token?: string }> }) { return <TokenForm mode="reset" token={(await searchParams).token} />; }
