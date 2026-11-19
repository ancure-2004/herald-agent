import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE_URL = 'http://localhost:3000';
const OUT_SCREENS_DIR = process.env.OUT_SCREENS_DIR || '/mnt/database/Developing/firstmate/projects/PersonalOS and CRM/ui_pass/screens/before';
const OUT_REPORT_JSON = process.env.OUT_REPORT_JSON || '/mnt/database/Developing/firstmate/projects/PersonalOS and CRM/ui_pass/reports/probe-before.json';
const OUT_REPORT_MD = process.env.OUT_REPORT_MD || '/mnt/database/Developing/firstmate/projects/PersonalOS and CRM/ui_pass/reports/probe-before.md';

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

async function runLayoutAudit(page, contextName) {
  return await page.evaluate((ctx) => {
    const issues = {
      context: ctx,
      horizontalOverflow: [],
      viewportOverflow: [],
      clippedText: [],
      headerObscured: [],
      mainScrollIssue: false,
      modalIssues: [],
      zIndices: new Set(),
    };

    const docWidth = document.documentElement.clientWidth;
    const docHeight = document.documentElement.clientHeight;
    const scrollWidth = document.documentElement.scrollWidth;

    if (scrollWidth > docWidth + 1) {
      issues.horizontalOverflow.push({
        element: 'html/body',
        scrollWidth,
        clientWidth: docWidth,
        overflowAmount: scrollWidth - docWidth
      });
    }

    const allEls = document.querySelectorAll('*');
    const header = document.querySelector('header');
    const headerRect = header ? header.getBoundingClientRect() : null;

    allEls.forEach((el) => {
      const style = window.getComputedStyle(el);
      if (style.zIndex && style.zIndex !== 'auto') {
        issues.zIndices.add(style.zIndex);
      }

      if (el.offsetWidth > 0 && el.offsetHeight > 0) {
        const rect = el.getBoundingClientRect();
        if (rect.right > docWidth + 2 && !['HTML', 'BODY'].includes(el.tagName)) {
          let parent = el.parentElement;
          let isContained = false;
          while (parent && parent !== document.body) {
            const pStyle = window.getComputedStyle(parent);
            if (pStyle.overflowX === 'hidden' || pStyle.overflow === 'hidden') {
              isContained = true;
              break;
            }
            parent = parent.parentElement;
          }
          if (!isContained) {
            issues.viewportOverflow.push({
              tag: el.tagName.toLowerCase(),
              className: (el.className || '').toString().slice(0, 80),
              right: Math.round(rect.right),
              viewportWidth: docWidth,
              excess: Math.round(rect.right - docWidth)
            });
          }
        }

        if (
          (style.overflow === 'hidden' || style.overflowX === 'hidden' || style.overflowY === 'hidden' || style.textOverflow === 'ellipsis') &&
          el.children.length === 0 &&
          (el.textContent || '').trim().length > 0
        ) {
          const isHorizClipped = el.scrollWidth > el.clientWidth + 1;
          const isVertClipped = el.scrollHeight > el.clientHeight + 1;
          if (isHorizClipped || isVertClipped) {
            issues.clippedText.push({
              text: (el.textContent || '').trim().slice(0, 50),
              className: (el.className || '').toString().slice(0, 80),
              scrollWidth: el.scrollWidth,
              clientWidth: el.clientWidth,
              scrollHeight: el.scrollHeight,
              clientHeight: el.clientHeight,
              horizClipped: isHorizClipped,
              vertClipped: isVertClipped
            });
          }
        }
      }
    });

    const main = document.querySelector('main');
    if (main && headerRect && headerRect.height > 0) {
      const firstChild = main.firstElementChild;
      if (firstChild) {
        const fcRect = firstChild.getBoundingClientRect();
        if (fcRect.top < headerRect.bottom - 2 && window.getComputedStyle(header).position === 'fixed') {
          issues.headerObscured.push({
            element: firstChild.tagName,
            top: fcRect.top,
            headerBottom: headerRect.bottom,
            overlap: headerRect.bottom - fcRect.top
          });
        }
      }

      const lastChild = main.lastElementChild;
      if (lastChild) {
        const lcRect = lastChild.getBoundingClientRect();
        const canScroll = main.scrollHeight > main.clientHeight;
        if (canScroll) {
          if (lcRect.bottom > docHeight && main.scrollTop + main.clientHeight < main.scrollHeight - 50) {
            issues.mainScrollIssue = true;
          }
        }
      }
    }

    const modals = document.querySelectorAll('[role="dialog"], .fixed.inset-0 > div:not(.fixed)');
    modals.forEach((m) => {
      const mRect = m.getBoundingClientRect();
      const mStyle = window.getComputedStyle(m);
      if (mRect.height > docHeight) {
        const hasScroll = mStyle.overflowY === 'auto' || mStyle.overflowY === 'scroll' || m.querySelector('.overflow-y-auto');
        if (!hasScroll) {
          issues.modalIssues.push({
            modalClass: (m.className || '').toString().slice(0, 80),
            height: Math.round(mRect.height),
            viewportHeight: docHeight,
            hasInternalScroll: false
          });
        }
      }
    });

    return {
      ...issues,
      zIndices: Array.from(issues.zIndices).sort((a, b) => parseInt(a) - parseInt(b))
    };
  }, contextName);
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

async function navigateToView(page, viewId) {
  try {
    if (viewId === 'dashboard') {
      await page.locator('button:has-text("Command")').first().click({ force: true }).catch(() => {});
      await page.waitForTimeout(200);
      await page.locator('aside button:has-text("Dashboard")').first().click({ force: true }).catch(() => {});
    } else if (viewId === 'board') {
      await page.locator('button:has-text("Command")').first().click({ force: true }).catch(() => {});
      await page.waitForTimeout(200);
      await page.locator('aside button:has-text("Pipeline Board")').first().click({ force: true }).catch(() => {});
    } else if (viewId === 'table') {
      await page.locator('button:has-text("Command")').first().click({ force: true }).catch(() => {});
      await page.waitForTimeout(200);
      await page.locator('aside button:has-text("Leads Table")').first().click({ force: true }).catch(() => {});
    } else if (viewId === 'sprint') {
      await page.locator('button:has-text("Command")').first().click({ force: true }).catch(() => {});
      await page.waitForTimeout(200);
      await page.locator('aside button:has-text("Evening Sprint")').first().click({ force: true }).catch(() => {});
    } else if (viewId === 'autopilot') {
      await page.locator('button:has-text("Cockpit")').first().click({ force: true }).catch(() => {});
    } else if (viewId === 'settings') {
      await page.locator('button:has-text("Command")').first().click({ force: true }).catch(() => {});
      await page.waitForTimeout(200);
      await page.locator('header button[title*="Captain Profile"]').first().click({ force: true }).catch(() => {});
      await page.waitForTimeout(200);
      await page.locator('button:has-text("Hustle Settings")').first().click({ force: true }).catch(() => {});
    }
  } catch (e) {
    console.warn(`Navigation warning for ${viewId}:`, e.message);
  }
  await page.waitForTimeout(400);
}

async function openModal(page, modalId) {
  try {
    if (modalId === 'CommandPalette') {
      await page.locator('button:has-text("Command"), div:has(kbd:has-text("⌘K")), header button[title*="Search"]').first().dispatchEvent('click').catch(() => {});
    } else if (modalId === 'AddLead') {
      await navigateToView(page, 'board');
      await page.locator('button[title*="Add lead"], button:has-text("Add Lead")').first().click({ force: true, timeout: 2000 }).catch(() => {});
    } else if (modalId === 'LeadDetail') {
      await navigateToView(page, 'table');
      await page.locator('tbody tr').first().click({ force: true, timeout: 2000 }).catch(() => {});
    } else if (modalId === 'ProblemReport') {
      await navigateToView(page, 'dashboard');
      await page.locator('button:has-text("Report Problem"), button[title*="diagnostic"], button[title*="Report"]').first().click({ force: true, timeout: 2000 }).catch(() => {});
    } else if (modalId === 'Assistant') {
      await page.locator('button[title*="Copilot"], button[title*="Assistant"]').first().click({ force: true, timeout: 2000 }).catch(() => {});
    }
  } catch (e) {
    console.warn(`Modal open warning for ${modalId}:`, e.message);
  }
  await page.waitForTimeout(300);
}

async function runFullProbe() {
  console.log('=== Starting Baseline UI Capture & Layout Probe ===');
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const allAuditResults = [];
  const views = ['dashboard', 'board', 'table', 'sprint', 'autopilot', 'settings'];
  const modals = ['CommandPalette', 'AddLead', 'LeadDetail', 'ProblemReport', 'Assistant'];

  for (const theme of THEMES) {
    for (const w of WIDTHS) {
      console.log(`\n--- Testing ${theme.toUpperCase()} theme at ${w.name}px ---`);
      const screenSubdir = path.join(OUT_SCREENS_DIR, theme, w.name);
      ensureDir(screenSubdir);

      // 1. Audit and capture views
      for (const view of views) {
        console.log(`Capturing view: ${view} (${w.name}px ${theme})`);
        const page = await browser.newPage();
        await page.setViewportSize({ width: w.width, height: w.height });
        await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForTimeout(500);
        await setTheme(page, theme);

        await navigateToView(page, view);
        const audit = await runLayoutAudit(page, `${view}_${w.name}_${theme}`);
        allAuditResults.push(audit);

        const screenPath = path.join(screenSubdir, `view-${view}.png`);
        await page.screenshot({ path: screenPath });
        await page.close();
      }

      // 2. Audit and capture modals (each in fresh page)
      for (const modal of modals) {
        console.log(`Capturing modal: ${modal} (${w.name}px ${theme})`);
        const page = await browser.newPage();
        await page.setViewportSize({ width: w.width, height: w.height });
        await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForTimeout(500);
        await setTheme(page, theme);

        await openModal(page, modal);
        const audit = await runLayoutAudit(page, `modal-${modal}_${w.name}_${theme}`);
        allAuditResults.push(audit);

        const screenPath = path.join(screenSubdir, `modal-${modal}.png`);
        await page.screenshot({ path: screenPath });
        await page.close();
      }
    }
  }

  await browser.close();

  // Save JSON report
  fs.writeFileSync(OUT_REPORT_JSON, JSON.stringify(allAuditResults, null, 2), 'utf8');
  console.log(`\nProbe JSON report written to: ${OUT_REPORT_JSON}`);

  // Generate Markdown Summary
  let md = `# Layout Probe Report (Baseline)\n\n`;
  md += `*Generated: ${new Date().toISOString()}*\n`;
  md += `*Total test conditions: ${allAuditResults.length}*\n\n`;
  md += `## Summary of Layout Issues\n\n`;

  let totalHoriz = 0;
  let totalViewportExcess = 0;
  let totalClippedText = 0;
  let totalModalIssues = 0;
  const allZ = new Set();

  allAuditResults.forEach(r => {
    totalHoriz += r.horizontalOverflow.length;
    totalViewportExcess += r.viewportOverflow.length;
    totalClippedText += r.clippedText.length;
    totalModalIssues += r.modalIssues.length;
    r.zIndices.forEach(z => allZ.add(z));
  });

  md += `| Category | Issue Count |\n`;
  md += `| :--- | :--- |\n`;
  md += `| Horizontal Document Overflow Events | ${totalHoriz} |\n`;
  md += `| Elements Extending Past Viewport | ${totalViewportExcess} |\n`;
  md += `| Clipped Text (Text Overflow / Truncation) | ${totalClippedText} |\n`;
  md += `| Modals Exceeding Viewport Without Scroll | ${totalModalIssues} |\n`;
  md += `| Unique Z-Index Levels In Use | ${allZ.size} (${Array.from(allZ).join(', ')}) |\n\n`;

  md += `## Detailed Findings by Target & Breakpoint\n\n`;

  const issuesByContext = allAuditResults.filter(r =>
    r.horizontalOverflow.length > 0 ||
    r.viewportOverflow.length > 0 ||
    r.clippedText.length > 0 ||
    r.modalIssues.length > 0
  );

  for (const ctx of issuesByContext) {
    md += `### \`${ctx.context}\`\n`;
    if (ctx.horizontalOverflow.length > 0) {
      md += `- **Horizontal Overflow**: ${ctx.horizontalOverflow.map(h => `${h.element} (+${h.overflowAmount}px)`).join(', ')}\n`;
    }
    if (ctx.viewportOverflow.length > 0) {
      md += `- **Viewport Overflow**: ${ctx.viewportOverflow.length} element(s) extending past viewport: ${ctx.viewportOverflow.map(o => `\`<${o.tag} class="${o.className}">\` (+${o.excess}px)`).slice(0, 3).join(', ')}\n`;
    }
    if (ctx.clippedText.length > 0) {
      md += `- **Clipped Text**: ${ctx.clippedText.length} text element(s) clipped: ${ctx.clippedText.map(c => `"${c.text}" (scrollWidth: ${c.scrollWidth} > clientWidth: ${c.clientWidth})`).slice(0, 3).join(', ')}\n`;
    }
    if (ctx.modalIssues.length > 0) {
      md += `- **Modal Height**: ${ctx.modalIssues.map(m => `Modal height ${m.height}px exceeds viewport ${m.viewportHeight}px without internal scroll`).join(', ')}\n`;
    }
    md += `\n`;
  }

  fs.writeFileSync(OUT_REPORT_MD, md, 'utf8');
  console.log(`Probe Markdown report written to: ${OUT_REPORT_MD}`);
  console.log('=== Probe and Screenshot Matrix Complete ===');
}

runFullProbe().catch(err => {
  console.error('Probe execution fatal error:', err);
  process.exit(1);
});
