// API keys look like vr_live_ + 32 URL-safe characters. This file is pure so it can be unit-tested.
export const KEY_RE = /^vr_live_[A-Za-z0-9_-]{32}$/;
export function parseBearer(header: string | null): string | null { const m = /^Bearer\s+(\S+)$/i.exec(header ?? ""); return m && KEY_RE.test(m[1]) ? m[1] : null; }
