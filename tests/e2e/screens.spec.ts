import { test, expect } from "@playwright/test";

// Captures the README screenshots with real data: a devnet job with captions, its receipt, the Tab with a real
// deposit address, and the rescue page. Run with scripts/e2e-screens.sh (starts the local devnet server). Not part of CI.
const BASE = process.env.E2E_PAID_BASE_URL ?? "http://localhost:3121";
test.use({ baseURL: BASE, viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });

test("capture README screenshots", async ({ page }) => {
  const part = process.env.SCREENS_PART ?? "all";
  await page.goto(part === "tab" ? "/tab" : "/studio");
  await page.getByTestId("connect").click();
  await page.getByRole("menuitem", { name: /Meruit Test Wallet/ }).click();
  await expect(page.getByTestId("address-chip")).toBeVisible();
  if (part !== "tab") {
    await page.getByRole("radio", { name: "One minute" }).click();
    await page.getByTestId("start").click();
    await page.getByTestId("approve").click({ timeout: 60_000 });
    await expect(page.getByTestId("cues")).toBeVisible({ timeout: 90_000 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: "docs/screens/studio-captions.png" });

    await page.getByTestId("receipt-link").click();
    await expect(page.getByTestId("receipt")).toContainText(/settle/i, { timeout: 30_000 });
    await page.waitForTimeout(300);
    await page.screenshot({ path: "docs/screens/receipt.png" });
  }

  await page.goto("/tab");
  await page.getByTestId("connect").click({ timeout: 5000 }).catch(() => undefined);
  await page.getByRole("menuitem", { name: /Meruit Test Wallet/ }).click({ timeout: 3000 }).catch(() => undefined);
  await expect(page.getByTestId("address-chip")).toBeVisible();
  await page.getByTestId("get-address").click();
  await expect(page.getByTestId("deposit-address")).toBeVisible({ timeout: 40_000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: "docs/screens/tab-deposit.png" });

  await page.goto("/rescue");
  await page.getByTestId("connect").click({ timeout: 5000 }).catch(() => undefined);
  await page.getByRole("menuitem", { name: /Meruit Test Wallet/ }).click({ timeout: 3000 }).catch(() => undefined);
  await expect(page.getByTestId("address-chip")).toBeVisible();
  await page.waitForTimeout(6000);
  await page.screenshot({ path: "docs/screens/rescue.png" });
});
