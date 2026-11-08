import { test, expect } from "@playwright/test";

// Drives the real Studio in a browser against a local devnet server with the test-only Wallet Standard wallet.
// Run with scripts/e2e-paid.sh, which starts that server. Real devnet transactions happen here (about $0.01 each).
const BASE = process.env.E2E_PAID_BASE_URL ?? "http://localhost:3121";
test.use({ baseURL: BASE });
test.describe.configure({ mode: "serial" });

async function connect(page: import("@playwright/test").Page) {
  await page.goto("/studio");
  await page.getByTestId("connect").click();
  await page.getByRole("menuitem", { name: /Meruit Test Wallet/ }).click();
  await expect(page.getByTestId("address-chip")).toBeVisible();
  await page.getByRole("radio", { name: "One minute" }).click();
}

test("approve, sign, captions, export, receipt: the amount shown is the amount signed", async ({ page }) => {
  let signedAmount: string | null = null;
  await page.route("**/api/transcribe", async (route) => {
    const h = route.request().headers()["payment-signature"];
    if (h) {
      const payload = JSON.parse(Buffer.from(h, "base64").toString());
      signedAmount = String(payload.accepted?.amount ?? payload.requirements?.amount ?? "");
    }
    await route.continue();
  });
  await connect(page);
  await page.getByTestId("start").click();

  const dialog = page.getByRole("dialog", { name: /Up to/ });
  await expect(dialog).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId("approval-headline")).toHaveText("Up to $0.01 for 01:00 of audio");
  await expect(page.getByTestId("approval-amount")).toContainText("up to $0.01");
  await page.getByTestId("approve").click();

  await expect(page.getByTestId("cues")).toBeVisible({ timeout: 90_000 });
  expect(await page.locator("[data-testid=cues] li").count()).toBeGreaterThan(3);
  expect(signedAmount, "the PAYMENT-SIGNATURE header carried the amount").toBe("10000");

  await expect(page.getByTestId("meter-rail")).toContainText("delivered 01:00 of 01:00");
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByTestId("export-srt").click()]);
  expect(download.suggestedFilename()).toBe("captions.srt");

  await page.getByTestId("receipt-link").click();
  await expect(page.getByTestId("receipt")).toBeVisible();
  await expect(page.getByTestId("receipt")).toContainText("$0.01");
  await expect(page.getByTestId("receipt")).toContainText(/settle/i, { timeout: 30_000 });

  await page.getByTestId("disconnect").click();
  await expect(page.getByTestId("connect")).toBeVisible();
});

test("B10: declining in the approval dialog opens no job and charges nothing", async ({ page }) => {
  await connect(page);
  await page.getByTestId("start").click();
  await expect(page.getByTestId("approval-headline")).toBeVisible({ timeout: 60_000 });
  await page.getByTestId("decline").click();
  await expect(page.getByTestId("message")).toContainText("nothing was charged", { timeout: 20_000 });
  await expect(page.getByTestId("cues")).toHaveCount(0);
});

test("B10: the wallet rejecting the signature opens no job and charges nothing", async ({ page }) => {
  await connect(page);
  await page.evaluate(() => sessionStorage.setItem("meruit:e2e:reject", "1"));
  await page.getByTestId("start").click();
  await expect(page.getByTestId("approval-headline")).toBeVisible({ timeout: 60_000 });
  await page.getByTestId("approve").click();
  await expect(page.getByTestId("message")).toContainText(/declined|nothing was charged/i, { timeout: 30_000 });
  await expect(page.getByTestId("cues")).toHaveCount(0);
  await page.evaluate(() => sessionStorage.removeItem("meruit:e2e:reject"));
});
