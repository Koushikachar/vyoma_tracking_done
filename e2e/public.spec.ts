import { test, expect } from "@playwright/test";
for (const path of ["/pricing", "/features", "/integrations"]) test(`${path} renders and does not scroll sideways`, async ({ page }) => {
  await page.goto(path); await expect(page.locator("h1")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)).toBe(false);
});
test("seller area sends visitors to sign in", async ({ page }) => { await page.goto("/seller"); await expect(page).toHaveURL(/\/seller\/login/); });
test("seller API refuses anonymous requests", async ({ request }) => { const r = await request.post("/api/seller/orders", { data: { action: "import", rows: [{ orderNo: "x" }] } }); expect(r.status()).toBe(401); });
test("saved-records API refuses anonymous requests", async ({ request }) => { const r = await request.post("/api/seller/records", { data: { action: "cod-status", id: "x", status: "OPEN" } }); expect(r.status()).toBe(401); });
test("an unknown customer tracking link is a 404 (needs the database)", async ({ page }) => { const r = await page.goto("/t/not-a-real-token-123"); expect(r?.status()).toBe(404); });
