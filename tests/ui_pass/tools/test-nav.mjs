import { chromium } from 'playwright';

async function testNav() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });

  console.log("Navigating to http://localhost:3000/...");
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(2000);

  // Check if active
  const title = await page.title();
  console.log("Page title:", title);

  // Check navigation elements
  const commandBtn = await page.$('button:has-text("Command")');
  console.log("Command btn found:", !!commandBtn);

  const cockpitBtn = await page.$('button:has-text("Cockpit")');
  console.log("Cockpit btn found:", !!cockpitBtn);

  // Click Cockpit
  if (cockpitBtn) {
    await cockpitBtn.click();
    await page.waitForTimeout(1000);
    console.log("Clicked Cockpit. Checking header text...");
  }

  // Switch back to Command
  if (commandBtn) {
    await commandBtn.click();
    await page.waitForTimeout(1000);
    console.log("Switched back to Command.");
  }

  // Check sidebar navigation
  const boardBtn = await page.$('button:has-text("Pipeline Board")');
  console.log("Board btn found:", !!boardBtn);

  const tableBtn = await page.$('button:has-text("Leads Table")');
  console.log("Table btn found:", !!tableBtn);

  const sprintBtn = await page.$('button:has-text("Evening Sprint")');
  console.log("Sprint btn found:", !!sprintBtn);

  await browser.close();
  console.log("Nav test complete.");
}

testNav().catch(err => {
  console.error("Test nav error:", err);
  process.exit(1);
});
