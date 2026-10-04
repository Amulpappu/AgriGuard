import { test, expect } from "@playwright/test";
import path from "path";

test.describe("AgriGuard E2E Scan Flow", () => {
  test.use({ viewport: { width: 360, height: 740 } }); // Test on 360px mobile viewport

  test("completes end-to-end scan flow on mobile viewport", async ({ page }) => {
    // 1. Visit Login Page
    await page.goto("http://localhost:3000/");
    await expect(page).toHaveTitle(/AgriGuard/i);

    // 2. Perform Login
    await page.fill('input[type="email"]', "demo@agriguard.in");
    await page.fill('input[type="password"]', "Demo1234!");
    await page.click('button[type="submit"]');

    // 3. Land on Dashboard
    await page.waitForURL("**/dashboard", { timeout: 10000 });
    await expect(page.locator("text=Total Scans")).toBeVisible();

    // 4. Navigate to Scan Page
    await page.click('a[href="/scan"]');
    await page.waitForURL("**/scan");

    // 5. Select Crop (Tomato)
    const tomatoButton = page.locator('button:has-text("Tomato")').first();
    if (await tomatoButton.isVisible()) {
      await tomatoButton.click();
    }

    // 6. Upload Test Leaf Image
    const fileInput = page.locator('input[type="file"]');
    const testImagePath = path.resolve(__dirname, "../../backend/test_leaf.jpg");
    await fileInput.setInputFiles(testImagePath);

    // 7. Click Analyze / Submit
    const submitButton = page.locator('button:has-text("Analyze"), button:has-text("Scan")').first();
    await submitButton.click();

    // 8. Wait for Scan Result page
    await page.waitForURL(/.*\/scan\/[a-f0-9-]+/, { timeout: 15000 });

    // 9. Verify Safety & Confidence Elements
    await expect(page.locator("text=AI estimate").or(page.locator("text=Estimate"))).toBeVisible();
    await expect(page.locator("text=Disclaimer").or(page.locator("text=Decision-support"))).toBeVisible();
  });
});
