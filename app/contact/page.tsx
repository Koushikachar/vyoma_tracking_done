"use client";
import { useState } from "react";
import Script from "next/script";
export default function Contact() {
  const [st, setSt] = useState<"idle" | "sending" | "ok" | "err">("idle"); const site = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  async function submit(e: React.FormEvent<HTMLFormElement>) { e.preventDefault(); setSt("sending"); const fd = new FormData(e.currentTarget);
    const body = { name: fd.get("name"), email: fd.get("email"), company: fd.get("company") || undefined, message: fd.get("message"), website: fd.get("website"), token: fd.get("cf-turnstile-response") ?? undefined };
    const r = await fetch("/api/contact", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }); setSt(r.ok ? "ok" : "err"); }
  const i = "w-full rounded-lg border border-line bg-transparent px-3 py-3";
  return (<div className="mx-auto max-w-lg my-16 px-8 py-10 glass rounded-3xl"><h1 className="text-3xl font-bold mb-6">Contact</h1>
    {site && <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />}
    {st === "ok" ? <p role="status">Thanks, we’ll be in touch.</p> : <form onSubmit={submit} className="space-y-4">
      <input name="name" required minLength={2} placeholder="Name" className={i} /><input name="email" type="email" required placeholder="Email" className={i} /><input name="company" placeholder="Company (optional)" className={i} />
      <textarea name="message" required minLength={10} rows={5} placeholder="Message" className={i} /><input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      {site && <div className="cf-turnstile" data-sitekey={site} />}
      {st === "err" && <p role="alert" className="text-sm text-red-500">Couldn’t send. Please check the form and try again.</p>}
      <button disabled={st === "sending"} className="rounded-lg bg-brand text-bg font-semibold px-6 py-3 disabled:opacity-60">{st === "sending" ? "Sending…" : "Send message"}</button></form>}</div>); }
