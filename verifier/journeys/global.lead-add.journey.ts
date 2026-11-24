/**
 * Journey for the feature global.lead-add (Add New Lead, reached from Cmd+K):
 * the Master registers a clinic from the palette, then finds it in the Leads
 * Table. It also covers palette.actions and table.list. The clinic name is
 * unique per run, and the proof is a second view: the Leads Table, before and
 * after a reload (a save message alone is not proof).
 */
import { expect, test } from "@playwright/test";

/** A clinic name no earlier run used, so a row from before never proves this run. */
const CLINIC = `Verifier Clinic ${Date.now()}`;

// herald bug: Add New Lead save returns 422 (Backlog rq-adding-a-lead-from-the-app-fails-the-add-e9); unpark when fixed.
test.fixme("add a lead from Cmd+K and see it in the Leads Table", async ({ page }, testInfo) => {
  test.setTimeout(300_000);
  const leadsTable = page.getByRole("button", { name: "Leads Table", exact: true });
  const clinicRow = page.getByRole("row").filter({ hasText: CLINIC });

  await test.step("open herald", async () => {
    await page.goto("/", { timeout: 120_000 });
    await expect(leadsTable).toBeVisible();
  });

  await test.step("open the command palette with Cmd+K", async () => {
    await page.keyboard.press("ControlOrMeta+k");
    await expect(page.getByPlaceholder("Type a command or search clinics, doctors, settings...")).toBeVisible();
  });

  await test.step("choose + Add New Lead", async () => {
    await page.getByText("+ Add New Lead", { exact: true }).click();
  });

  const dialog = page.getByRole("dialog");
  await test.step("fill the Add New Clinic Lead form", async () => {
    await expect(dialog).toContainText("Add New Clinic Lead");
    await dialog.getByPlaceholder("e.g. Apex Dental Studio").fill(CLINIC);
    await dialog.getByPlaceholder("Dr. Sharma").fill("Dr. Verifier");
    await dialog.getByPlaceholder("Indiranagar, BLR").fill("Indiranagar, BLR");
    await dialog.getByPlaceholder("+91...").fill("+91 90000 00001");
    await dialog.getByPlaceholder("apexdental_blr").fill("verifier_clinic");
  });

  await test.step("save with Add to Pipeline", async () => {
    await dialog.getByRole("button", { name: "Add to Pipeline", exact: true }).click();
    await expect(dialog).toBeHidden();
  });

  await test.step("open the Leads Table and find the clinic", async () => {
    await leadsTable.click();
    await expect(clinicRow).toBeVisible();
  });

  await test.step("reload and find the clinic in the Leads Table again", async () => {
    await page.reload();
    await leadsTable.click();
    await expect(clinicRow).toBeVisible();
    await testInfo.attach("leads-table-after-reload", { body: await page.screenshot(), contentType: "image/png" });
  });
});
