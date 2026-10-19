import { defineConfig } from "@playwright/test";
// Run with `npm run e2e` (first time: `npx playwright install chromium`). Set E2E_BASE_URL to test a deployed site instead of starting `npm run dev`.
export default defineConfig({ testDir: "./e2e", timeout: 30_000,
  use: { baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000" },
  webServer: process.env.E2E_BASE_URL ? undefined : { command: "npm run dev", url: "http://localhost:3000/pricing", reuseExistingServer: true, timeout: 120_000 },
  projects: [{ name: "desktop", use: { viewport: { width: 1280, height: 800 } } }, { name: "mobile", use: { viewport: { width: 375, height: 800 } } }] });
