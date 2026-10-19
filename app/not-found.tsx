import Link from "next/link";
export default function NotFound() { return <div className="mx-auto max-w-xl px-6 py-24 text-center"><h1 className="text-5xl font-bold">404</h1><p className="mt-3 text-muted">This page has taken a wrong turn.</p><Link href="/" className="inline-block mt-6 text-brand">Back home</Link></div>; }
