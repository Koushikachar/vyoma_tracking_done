import TokenForm from "@/components/seller/TokenForm";
export const metadata = { title: "Forgot password", robots: { index: false } };
export default function Page() { return <TokenForm mode="forgot" />; }
