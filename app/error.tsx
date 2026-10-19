"use client";
export default function Error({ reset }: { reset: () => void }) { return <div className="mx-auto max-w-xl px-6 py-24 text-center"><h1 className="text-2xl font-semibold">Something went wrong</h1><p className="mt-3 text-muted">Please try again.</p><button onClick={reset} className="mt-6 rounded-lg bg-brand text-bg px-5 py-2 font-semibold">Retry</button></div>; }
