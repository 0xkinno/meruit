import { test, expect } from "@playwright/test";

// Runs against a dev server started with NEXT_PUBLIC_E2E=1 and NEXT_PUBLIC_E2E_SECRET (a throwaway devnet key).
// The test wallet is a real Wallet Standard wallet, so connect and disconnect use the production code path.
const BASE = process.env.E2E_WALLET_BASE_URL ?? "http://localhost:3113";
test.use({ baseURL: BASE });

test.describe("wallet", () => {
  test("connect, show address chip, disconnect with the power icon", async ({ page }) => {
    await page.goto("/studio");
    await expect(page.getByTestId("connect")).toBeVisible();
    await page.getByTestId("connect").click();
    await page.getByRole("menuitem", { name: /Meruit Test Wallet/ }).click();
    const chip = page.getByTestId("address-chip");
    await expect(chip).toBeVisible();
    await expect(chip).toHaveText(/^\w{4}\.\.\.\w{4}$/);
    await expect(page.getByTestId("start")).toHaveText("Get captions");

    await page.getByTestId("disconnect").click();
    await expect(page.getByTestId("connect")).toBeVisible();
    await expect(page.getByTestId("start")).toHaveText("Connect a wallet to start");
  });

  test("starting a job without a wallet explains what to do and moves nothing", async ({ page }) => {
    await page.goto("/studio");
    await page.getByTestId("start").click();
    await expect(page.getByTestId("message")).toContainText("Connect a wallet first");
  });

  test("the studio shows the ceiling before any wallet prompt", async ({ page }) => {
    await page.goto("/studio");
    await expect(page.getByTestId("meter-rail")).toContainText("cap $0.12 for 12:00");
  });

  test("the rescue page needs no Meruit API: it renders with every /api route blocked", async ({ page }) => {
    await page.route("**/api/**", (r) => r.abort());
    await page.goto("/rescue");
    await expect(page.getByTestId("rescue")).toContainText("works even if they are gone");
    await page.getByTestId("connect").click();
    await page.getByRole("menuitem", { name: /Meruit Test Wallet/ }).click();
    await expect(page.getByTestId("address-chip")).toBeVisible();
    await expect(page.getByTestId("rescue")).toContainText(/Reading the network|No jobs found/);
  });
});
