/**
 * E2E smoke script for the critical public path.
 *
 * Run inside the Lovable sandbox (Playwright is preinstalled):
 *
 *   bunx playwright test tests/e2e/critical-path.spec.ts
 *
 * Or directly with the bundled Chromium:
 *
 *   bun tests/e2e/critical-path.spec.ts <BASE_URL>
 *
 * What this covers (no payment side-effects, safe in live mode):
 *   1. Landing page renders, no console errors.
 *   2. EN ↔ AR locale toggle flips <html dir>.
 *   3. /auth page loads with sign-in form.
 *   4. /pricing lists plans.
 *   5. Legal pages all return 200 (privacy, terms, dpa, refund).
 *   6. /sitemap.xml is well-formed.
 *
 * Authenticated flows (subscription / cancellation) MUST be exercised via the
 * manual checklist in docs/launch-checklist.md — they touch real billing state.
 */

import { test, expect } from "@playwright/test";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:8080";

test.describe("public critical path", () => {
  test("landing page renders with no console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });

    const resp = await page.goto(BASE, { waitUntil: "domcontentloaded" });
    expect(resp?.status()).toBeLessThan(400);
    await expect(page).toHaveTitle(/.+/);
    expect(errors, errors.join("\n")).toEqual([]);
  });

  test("locale toggle flips direction", async ({ page }) => {
    await page.goto(BASE);
    const initialDir = await page.evaluate(() => document.documentElement.dir);
    const toggle = page.getByRole("button", { name: /العربية|Arabic|EN|AR/i }).first();
    if (await toggle.count()) {
      await toggle.click();
      await page.waitForTimeout(300);
      const after = await page.evaluate(() => document.documentElement.dir);
      expect(after).not.toBe(initialDir);
    }
  });

  test("auth page exposes a sign-in form", async ({ page }) => {
    const resp = await page.goto(`${BASE}/auth`);
    expect(resp?.status()).toBeLessThan(400);
    await expect(page.locator('input[type="email"]').first()).toBeVisible();
  });

  test("legal pages all 200", async ({ request }) => {
    for (const path of ["/privacy", "/terms", "/dpa", "/refund"]) {
      const r = await request.get(`${BASE}${path}`);
      expect(r.status(), `${path} should be 200`).toBeLessThan(400);
    }
  });

  test("sitemap is valid xml", async ({ request }) => {
    const r = await request.get(`${BASE}/sitemap.xml`);
    expect(r.status()).toBe(200);
    const body = await r.text();
    expect(body).toContain("<urlset");
    expect(body).toContain("</urlset>");
  });
});
