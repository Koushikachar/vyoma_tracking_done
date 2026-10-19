import JoinForm from "@/components/seller/JoinForm";
export const metadata = { title: "Join the team", robots: { index: false } };
export default async function Page({ searchParams }: { searchParams: Promise<{ token?: string }> }) { return <JoinForm token={(await searchParams).token} />; }
