import { chromium } from 'playwright';

async function testModals() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });

  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  // 1. Command Palette
  console.log("Testing Command Palette (Cmd+K)...");
  await page.keyboard.press('Control+k');
  await page.waitForTimeout(600);
  let cp = await page.$('input[placeholder*="Type a command or search"]');
  console.log("Command palette open:", !!cp);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);

  // 2. Add Lead Modal (via Kanban)
  console.log("Testing Add Lead Modal...");
  const boardBtn = await page.$('button:has-text("Pipeline Board")');
  if (boardBtn) await boardBtn.click();
  await page.waitForTimeout(800);
  const addLeadBtn = await page.$('button:has-text("Add Lead")');
  if (addLeadBtn) {
    await addLeadBtn.click();
    await page.waitForTimeout(600);
    const modalTitle = await page.$('text="New Qualified Clinic Lead"');
    console.log("Add lead modal open:", !!modalTitle);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
  }

  // 3. Lead Detail Modal (via Leads Table)
  console.log("Testing Lead Detail Modal...");
  const tableBtn = await page.$('button:has-text("Leads Table")');
  if (tableBtn) await tableBtn.click();
  await page.waitForTimeout(800);
  const firstRow = await page.$('tbody tr');
  if (firstRow) {
    await firstRow.click();
    await page.waitForTimeout(600);
    const detailHeader = await page.$('text="Next Action Lock-Step"');
    console.log("Lead detail modal open:", !!detailHeader);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
  }

  // 4. Problem Report Modal (via Dashboard)
  console.log("Testing Problem Report Modal...");
  const cmdBtn = await page.$('button:has-text("Command")');
  if (cmdBtn) await cmdBtn.click();
  await page.waitForTimeout(800);
  const bugBtn = await page.$('button[title*="Report Diagnostic Problem"], button:has-text("Diagnostics")');
  if (bugBtn) {
    await bugBtn.click();
    await page.waitForTimeout(600);
    const reportTitle = await page.$('text="Telemetry Problem Report"');
    console.log("Problem report modal open:", !!reportTitle);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
  }

  // 5. Assistant Drawer
  console.log("Testing Assistant Drawer...");
  const assistantBtn = await page.$('button[title*="AI Copilot Assistant"]');
  if (assistantBtn) {
    await assistantBtn.click();
    await page.waitForTimeout(600);
    const drawerInput = await page.$('input[placeholder*="Ask a question or describe an action"]');
    console.log("Assistant drawer open:", !!drawerInput);
    // close drawer by clicking button again
    await assistantBtn.click();
    await page.waitForTimeout(400);
  }

  await browser.close();
  console.log("Modal test complete.");
}

testModals().catch(err => {
  console.error("Test modals error:", err);
  process.exit(1);
});
