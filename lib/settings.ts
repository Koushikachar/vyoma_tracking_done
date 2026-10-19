import { z } from "zod";
import { validTz } from "@/lib/tz";
import { prisma } from "@/lib/db/prisma";
export const settingsSchema = z.object({ cacheSeconds: z.number().int().min(0).max(86400).default(300), maintenanceMode: z.boolean().default(false),
  publicRatePerMinute: z.number().int().min(1).max(600).default(20), retentionDays: z.number().int().min(7).max(3650).default(90), alertThreshold: z.number().int().min(1).max(100).default(70), timeZone: z.string().refine(validTz).default("Asia/Kolkata"), notifyEmail: z.string().email().or(z.literal("")).default("") });
export type Settings = z.infer<typeof settingsSchema>;
let cache: { v: Settings; at: number } | null = null;
export const invalidateSettings = () => { cache = null; };
export async function getSettings(): Promise<Settings> {
  if (cache && Date.now() - cache.at < 30_000) return cache.v;
  let raw: unknown = {}; if (process.env.DATABASE_URL) { try { raw = (await prisma.systemSetting.findUnique({ where: { key: "app" } }))?.value ?? {}; } catch {} }
  const v = settingsSchema.parse(raw); cache = { v, at: Date.now() }; return v;
}
export async function saveSettings(v: Settings) { await prisma.systemSetting.upsert({ where: { key: "app" }, update: { value: v }, create: { key: "app", value: v } }); invalidateSettings(); }
