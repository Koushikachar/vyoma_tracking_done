import TokenForm from "@/components/seller/TokenForm";
export const metadata = { title: "Confirm your email", robots: { index: false } };
export default async function Page({ searchParams }: { searchParams: Promise<{ token?: string }> }) { return <TokenForm mode="verify" token={(await searchParams).token} />; }
