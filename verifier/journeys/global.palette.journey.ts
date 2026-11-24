/**
 * Journey for the feature global.palette (Command Palette, Cmd+K): the Master
 * jumps between screens from the palette. It runs on an empty database (no
 * leads), so it needs no seed data. The proof is a second view: each jump must
 * show the target screen's own heading, not just the palette closing.
 */
import { expect, test } from "@playwright/test";

test("jump between screens from Cmd+K", async ({ page }, testInfo) => {
  const palette = page.getByRole("dialog");
  const paletteInput = page.getByPlaceholder("Type a command or search clinics, doctors, settings...");
  const leadsTable = page.getByRole("button", { name: "Leads Table", exact: true });
  const tableHeader = page.getByRole("columnheader", { name: "Clinic & Doctor", exact: true });
  const boardFilter = page.getByRole("button", { name: "Filter board", exact: true });

  await test.step("open herald and wait for the Overview screen", async () => {
    await page.goto("/", { timeout: 120_000 });
    await expect(leadsTable).toBeVisible();
  });

  await test.step("open the command palette with Cmd+K", async () => {
    await page.keyboard.press("ControlOrMeta+k");
    await expect(palette).toBeVisible();
    await expect(paletteInput).toBeFocused();
  });

  await test.step("type Full Leads Table and choose it", async () => {
    await paletteInput.fill("Full Leads Table");
    await page.getByText("Full Leads Table", { exact: true }).click();
    await expect(palette).toBeHidden();
  });

  await test.step("the Leads Table screen shows", async () => {
    await expect(tableHeader).toBeVisible();
  });

  await test.step("open the command palette with Cmd+K again", async () => {
    await page.keyboard.press("ControlOrMeta+k");
    await expect(palette).toBeVisible();
  });

  await test.step("choose Pipeline Kanban Board", async () => {
    await paletteInput.fill("Pipeline Kanban Board");
    await page.getByText("Pipeline Kanban Board", { exact: true }).click();
    await expect(palette).toBeHidden();
  });

  await test.step("the Kanban Board screen shows", async () => {
    await expect(boardFilter).toBeVisible();
  });

  await test.step("open the command palette with Cmd+K and close it with Escape", async () => {
    await page.keyboard.press("ControlOrMeta+k");
    await expect(palette).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(palette).toBeHidden();
  });

  await test.step("the Kanban Board is still the screen after the palette closes", async () => {
    await expect(boardFilter).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("kanban-after-palette.png") });
  });
});
