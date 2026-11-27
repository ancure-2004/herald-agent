/**
 * Journey for the Settings page: opens the Settings modal from the sidebar's
 * profile menu, clicks "All settings" to close the modal and open the Settings
 * page, and verifies the sidebar's Settings list is visible.
 */
import { expect, test } from "@playwright/test";

test("open Settings modal and navigate to Settings page", async ({ page }) => {
  const leadsTable = page.getByRole("button", { name: "Leads Table", exact: true });
  const profileButton = page.locator('button[title="Captain Profile & Settings"]:visible');
  const openSettingsMenuItem = page.locator("button:has(svg.lucide-settings):visible").last();
  const allSettingsButton = page.getByRole("button", { name: /All settings/i });
  const sidebarSettingsHeading = page.getByText("Hustle & Blueprint", { exact: true });

  await test.step("open herald and wait for the Overview screen", async () => {
    await page.goto("/", { timeout: 120_000 });
    await expect(leadsTable).toBeVisible();
  });

  await test.step("open the Settings modal via the profile menu", async () => {
    await profileButton.click();
    await openSettingsMenuItem.click();
    await expect(allSettingsButton).toBeVisible();
  });

  await test.step("follow All settings to the Settings page and verify sidebar list", async () => {
    await allSettingsButton.click();
    await expect(allSettingsButton).toBeHidden();
    await expect(sidebarSettingsHeading).toBeVisible();
  });
});
