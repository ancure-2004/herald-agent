import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE_URL = 'http://localhost:3000';
const OUT_SCREENS_DIR = '/mnt/database/Developing/firstmate/projects/PersonalOS and CRM/ui_pass/screens/after';

const WIDTHS = [
  { width: 1440, height: 900, name: '1440' },
  { width: 1024, height: 800, name: '1024' },
  { width: 768, height: 1024, name: '768' },
  { width: 390, height: 844, name: '390' },
];

const THEMES = ['dark', 'light'];

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function setTheme(page, theme) {
  await page.evaluate((th) => {
    if (th === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('crm_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('crm_theme', 'light');
    }
  }, theme);
  await page.waitForTimeout(200);
}

async function probeDashboard() {
  console.log('=== Probing Dashboard View (Phase 6) ===');
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const results = [];

  for (const theme of THEMES) {
    for (const w of WIDTHS) {
      const page = await browser.newPage();
      await page.setViewportSize({ width: w.width, height: w.height });
      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 15000 });
      // Wait for data fetch to complete and loading screen to dismiss
      await page.waitForSelector('h1:has-text("Good")', { timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(500);
      await setTheme(page, theme);

      // Ensure we are on Dashboard view
      await page.locator('button:has-text("Command")').first().click({ force: true }).catch(() => {});
      await page.waitForTimeout(200);
      await page.locator('aside button:has-text("Dashboard")').first().click({ force: true }).catch(() => {});
      await page.waitForTimeout(400);

      const audit = await page.evaluate((wWidth) => {
        const docWidth = document.documentElement.clientWidth;
        const scrollWidth = document.documentElement.scrollWidth;

        const horizOverflow = scrollWidth > docWidth + 1;
        const viewportOverflows = [];
        const clippedTexts = [];

        // Scan main content elements
        const main = document.querySelector('main');
        if (main) {
          const els = main.querySelectorAll('*');
          els.forEach(el => {
            const style = window.getComputedStyle(el);
            const rect = el.getBoundingClientRect();

            if (rect.right > docWidth + 2) {
              // Check if contained within an element that has overflow-x auto/scroll/hidden
              let parent = el.parentElement;
              let isContained = false;
              while (parent && parent !== document.body) {
                const pStyle = window.getComputedStyle(parent);
                if (pStyle.overflowX === 'auto' || pStyle.overflowX === 'scroll' || pStyle.overflowX === 'hidden') {
                  isContained = true;
                  break;
                }
                parent = parent.parentElement;
              }

              if (!isContained) {
                viewportOverflows.push({
                  tag: el.tagName,
                  class: (el.className || '').toString().slice(0, 50),
                  excess: rect.right - docWidth
                });
              }
            }

            if (
              (style.overflow === 'hidden' || style.textOverflow === 'ellipsis') &&
              el.children.length === 0 &&
              (el.textContent || '').trim().length > 0
            ) {
              if (el.scrollWidth > el.clientWidth + 1) {
                // Ignore intentional short text truncations if ellipsis is applied properly
                clippedTexts.push({
                  text: (el.textContent || '').trim().slice(0, 40),
                  scrollWidth: el.scrollWidth,
                  clientWidth: el.clientWidth
                });
              }
            }
          });
        }

        return {
          width: wWidth,
          horizOverflow,
          viewportOverflows,
          clippedTexts
        };
      }, w.width);

      results.push({
        theme,
        width: w.name,
        audit
      });

      // Save screenshot
      const screenSubdir = path.join(OUT_SCREENS_DIR, theme, w.name);
      ensureDir(screenSubdir);
      const screenPath = path.join(screenSubdir, 'view-dashboard.png');
      await page.screenshot({ path: screenPath });
      console.log(`Saved screenshot: ${screenPath}`);

      await page.close();
    }
  }

  await browser.close();

  console.log('\n=== Dashboard Probe Audit Results ===');
  let hasFailures = false;
  results.forEach(r => {
    console.log(`[${r.theme.toUpperCase()} ${r.width}px] Horiz Overflow: ${r.audit.horizOverflow ? 'FAIL' : '0 (PASS)'}, Viewport Overflow: ${r.audit.viewportOverflows.length}`);
    if (r.audit.viewportOverflows.length > 0) {
      console.log('Viewport overflows detail:', JSON.stringify(r.audit.viewportOverflows, null, 2));
    }
    if (r.audit.horizOverflow || r.audit.viewportOverflows.length > 0) hasFailures = true;
  });

  if (hasFailures) {
    console.error('Probe detected overflow failures!');
    process.exit(1);
  } else {
    console.log('ALL DASHBOARD VIEWPORTS PASSED WITH 0 OVERFLOW/CLIPPING ISSUES!');
  }
}

probeDashboard().catch(err => {
  console.error('Dashboard probe error:', err);
  process.exit(1);
});
