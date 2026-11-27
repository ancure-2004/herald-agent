/**
 * Journey for the feature global.autopilot (operator profile menu and sprint
 * view): the Master opens the operator profile menu at the bottom of the
 * sidebar, verifies the sprint item is shown, captures a screenshot of the
 * open menu, and clicks the item to open the sprint view.
 */
import { expect, test } from "@playwright/test";

test("open profile menu and navigate to sprint view", async ({ page }, testInfo) => {
  const leadsTable = page.getByRole("button", { name: "Leads Table", exact: true });
  const profileButton = page.locator('button[title="Captain Profile & Settings"]:visible');
  const sprintMenuItem = page.locator("button:has(svg.lucide-clock):visible").last();
  const sprintHeading = page.getByText(/Time Budget Allocated|Loading sprint plan/i);

  await test.step("open herald and wait for the Overview screen", async () => {
    await page.goto("/", { timeout: 120_000 });
    await expect(leadsTable).toBeVisible();
  });

  await test.step("open the operator profile menu", async () => {
    await profileButton.click();
    await expect(profileButton).toHaveAttribute("aria-expanded", "true");
    await expect(sprintMenuItem).toBeVisible();
  });

  await test.step("capture screenshot of the open profile menu", async () => {
    await expect(page.locator(".recharts-surface").first()).toBeVisible({ timeout: 30_000 });
    await page.screenshot({ path: testInfo.outputPath("profile-menu.png") });
  });

  await test.step("click the sprint menu item and verify the sprint view", async () => {
    await sprintMenuItem.click();
    await expect(sprintHeading).toBeVisible();
  });
});
