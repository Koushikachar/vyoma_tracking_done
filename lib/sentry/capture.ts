// No-op unless SENTRY_DSN is set. Context is limited to hashes and metadata: never keys, tokens or carrier payloads.
export async function captureTrackingError(err: unknown, ctx: { carrier?: string; idHash: string; requestId: string; latencyMs: number; code: string }) {
  if (!process.env.SENTRY_DSN) return;
  try { const S = await import("@sentry/nextjs"); S.withScope(s => { s.setTags({ carrier: ctx.carrier ?? "unknown", errorCode: ctx.code }); s.setContext("tracking", { idHash: ctx.idHash, requestId: ctx.requestId, latencyMs: ctx.latencyMs }); S.captureException(err); }); } catch {}
}
