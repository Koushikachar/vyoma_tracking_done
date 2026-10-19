// Minutes to wait before retrying a failed job: 2, 4, 8, 16, 32, then 60.
export const backoffMinutes = (attempt: number) => Math.min(60, 2 ** Math.max(1, attempt));
