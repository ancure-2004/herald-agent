import fs from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';

const ROOT = process.cwd();
const BATCH_FILE = process.argv[2] ? path.resolve(process.argv[2]) : path.join(ROOT, 'batch.json');
const OUTPUT_DIR = path.join(ROOT, 'recordings');
const RAW_DIR = path.join(OUTPUT_DIR, '.raw');

const SETTINGS = {
  // Final video size
  width: 1280,
  height: 720,
  deviceScaleFactor: 1,

  // Page loading
  loadTimeoutMs: 30_000,
  networkIdleTimeoutMs: 12_000,

  // Small opening hold AFTER the loading section
  topPauseMs: 1_000,

  bottomPauseMs: 2_000,

  // Final video duration
  minDurationMs: 35_000,
  targetDurationMs: 45_000,
  maxDurationMs: 55_000,

  // Natural continuous scrolling
  minSpeedPxPerSec: 250,
  maxSpeedPxPerSec: 390,

  // Small pauses at section boundaries
  minSectionPauseMs: 900,
  maxSectionPauseMs: 1_700,

  // Section detection
  minSectionHeight: 240,
  minSectionGap: 180,

  // ----------------------------------------------------
  // Loading-intro detection
  // ----------------------------------------------------

  // Analyze the first part of the raw video at low FPS.
  analysisFps: 10,

  // A frame counts as "still loading" if it's a near-solid color —
  // either a white/off-white loading screen or a few black init
  // frames Playwright's video recorder sometimes emits before the
  // browser paints anything. We detect this purely via pixel range
  // (YMAX - YMIN), not average brightness: real-world loading
  // screens aren't always pure 255-white (this site measured ~236),
  // so a brightness cutoff is unreliable. A flat/blank frame has
  // near-zero spread regardless of its brightness; real rendered
  // content (text, images, buttons) always has meaningful contrast.
  minContentSpread: 18,

  // Require the non-white state to remain visible for this
  // long so a single loading flicker doesn't start the video.
  readyConfirmationMs: 500,

  // Never remove more than this much from the beginning.
  // This is only a safety limit.
  maxIntroTrimMs: 12_000,

  // Instead of cutting exactly at the detected transition, cut
  // a bit AFTER it. WhatsApp (and most chat apps) generate the
  // video's preview thumbnail from the very first frame, so if
  // we cut right on the white->content transition, some sites
  // still show a near-blank thumbnail. Pushing the cut forward
  // guarantees the first frame is unambiguously real content.
  introForwardBufferMs: 300,
};

function safeName(value) {
  return value
    .trim()
    .replace(/[^a-z0-9._-]+/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'website';
}

function ffmpegAvailable() {
  try {
    execFileSync('ffmpeg', ['-version'], {
      stdio: 'ignore',
    });

    return true;
  } catch {
    return false;
  }
}

async function loadBatch() {
  const raw = await fs.readFile(BATCH_FILE, 'utf8');

  const batch = JSON.parse(raw);

  if (!Array.isArray(batch) || batch.length === 0) {
    throw new Error(
      'batch.json must contain at least one { name, url } entry.'
    );
  }

  for (const [index, item] of batch.entries()) {
    if (!item?.name || !item?.url) {
      throw new Error(
        `Invalid batch entry at index ${index}. Expected name and url.`
      );
    }

    new URL(item.url);
  }

  return batch;
}

async function dismissCommonOverlays(page) {
  const labels = [
    'Accept',
    'Accept All',
    'I Agree',
    'Allow All',
    'Got it',
    'No Thanks',
    'Close',
  ];

  for (const label of labels) {
    try {
      const locator = page
        .getByRole('button', {
          name: new RegExp(`^${label}$`, 'i'),
        })
        .first();

      if (await locator.isVisible({ timeout: 350 })) {
        await locator.click({ timeout: 800 }).catch(() => {});
      }
    } catch {}
  }
}

async function waitForAssets(page) {
  await page.evaluate(async () => {
    if (document.fonts?.ready) {
      await document.fonts.ready.catch(() => {});
    }

    const images = [...document.images];

    const imagePromises = images.map((img) => {
      if (img.complete) {
        return Promise.resolve();
      }

      return new Promise((resolve) => {
        const done = () => resolve();

        img.addEventListener('load', done, { once: true });
        img.addEventListener('error', done, { once: true });
        setTimeout(done, 2500);
      });
    });

    await Promise.race([
      Promise.all(imagePromises),
      new Promise((resolve) => setTimeout(resolve, 3500)),
    ]);
  }).catch(() => {});
}

async function preparePage(page) {
  await page
    .addStyleTag({
      content: `
      html {
        scroll-behavior: auto !important;
      }

      *,
      *::before,
      *::after {
        scroll-behavior: auto !important;
      }

      video {
        max-width: 100%;
      }

      [data-recording-hide],
      .recording-hide {
        visibility: hidden !important;
      }
    `,
    })
    .catch(() => {});

  await dismissCommonOverlays(page);

  await waitForAssets(page);

  await page.evaluate(() => {
    window.scrollTo(0, 0);
  });

  await page.waitForTimeout(SETTINGS.topPauseMs);
}

async function getSectionStops(page) {
  return page.evaluate(
    ({ minHeight, minGap }) => {
      const viewport = window.innerHeight;

      const pageHeight = document.documentElement.scrollHeight;

      const raw = [
        ...document.querySelectorAll(
          `
          main > section,
          main section,
          body > section,
          [data-section]
          `
        ),
      ]
        .map((el) => {
          const rect = el.getBoundingClientRect();

          return {
            top: Math.round(rect.top + window.scrollY),
            height: Math.round(rect.height),
          };
        })
        .filter((x) => x.height >= minHeight && x.top >= 0)
        .sort((a, b) => a.top - b.top);

      const stops = [];

      for (const item of raw) {
        const stop = Math.max(
          0,
          Math.min(item.top - viewport * 0.12, pageHeight - viewport)
        );

        if (
          !stops.length ||
          Math.abs(stop - stops[stops.length - 1]) >= minGap
        ) {
          stops.push(stop);
        }
      }

      return {
        pageHeight,
        viewport,

        stops: stops.filter(
          (s) => s > viewport * 0.45 && s < pageHeight - viewport * 0.35
        ),
      };
    },
    {
      minHeight: SETTINGS.minSectionHeight,
      minGap: SETTINGS.minSectionGap,
    }
  );
}

async function smoothScrollTo(page, targetY, durationMs) {
  await page.evaluate(
    ({ targetY, durationMs }) =>
      new Promise((resolve) => {
        const timer = setTimeout(() => {
          window.scrollTo(0, targetY);
          resolve();
        }, durationMs + 800);

        const startY = window.scrollY;

        const distance = targetY - startY;

        if (Math.abs(distance) < 2) {
          clearTimeout(timer);
          window.scrollTo(0, targetY);

          resolve();
          return;
        }

        const start = performance.now();

        const ease = (t) => {
          if (t < 0.5) {
            return 4 * t * t * t;
          }

          return 1 - Math.pow(-2 * t + 2, 3) / 2;
        };

        const frame = (now) => {
          const progress = Math.min(1, (now - start) / durationMs);

          window.scrollTo(0, startY + distance * ease(progress));

          if (progress < 1) {
            requestAnimationFrame(frame);
          } else {
            clearTimeout(timer);
            resolve();
          }
        };

        requestAnimationFrame(frame);
      }),

    { targetY, durationMs }
  ).catch(() => {});
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

async function walkthrough(page) {
  const { pageHeight, viewport, stops } = await getSectionStops(page);

  const maxScroll = Math.max(0, pageHeight - viewport);

  if (maxScroll <= 10) {
    await page.waitForTimeout(SETTINGS.minDurationMs);

    return;
  }

  const estimatedPauses = Math.max(4, Math.min(8, stops.length));

  const pauseBudget = estimatedPauses * 1_250;

  const desiredMotionMs = Math.max(
    22_000,
    SETTINGS.targetDurationMs -
      SETTINGS.topPauseMs -
      SETTINGS.bottomPauseMs -
      pauseBudget
  );

  const idealSpeed = (maxScroll / desiredMotionMs) * 1000;

  const speed = Math.max(
    SETTINGS.minSpeedPxPerSec,
    Math.min(SETTINGS.maxSpeedPxPerSec, idealSpeed)
  );

  const rawStops = [0, ...stops, maxScroll];

  const uniqueStops = rawStops.filter(
    (value, index, arr) =>
      index === 0 || Math.abs(value - arr[index - 1]) > 100
  );

  const startedAt = Date.now();

  for (let i = 1; i < uniqueStops.length; i++) {
    const target = uniqueStops[i];

    const distance = Math.abs(target - uniqueStops[i - 1]);

    const speedFactor = randomBetween(0.9, 1.08);

    const durationMs = Math.max(
      900,
      (distance / (speed * speedFactor)) * 1000
    );

    await smoothScrollTo(page, target, durationMs);

    if (i < uniqueStops.length - 1) {
      const pause = randomBetween(
        SETTINGS.minSectionPauseMs,
        SETTINGS.maxSectionPauseMs
      );

      await page.waitForTimeout(pause);
    }

    if (
      Date.now() - startedAt >=
      SETTINGS.maxDurationMs - SETTINGS.bottomPauseMs
    ) {
      break;
    }
  }

  const currentY = await page
    .evaluate(() => window.scrollY)
    .catch(() => 0);

  if (maxScroll - currentY > 20) {
    const finalDuration = Math.max(
      1200,
      Math.min(3500, (maxScroll - currentY) / 0.32)
    );

    await smoothScrollTo(page, maxScroll, finalDuration).catch(() => {});
  }

  await page.waitForTimeout(SETTINGS.bottomPauseMs);

  const elapsed = Date.now() - startedAt + SETTINGS.topPauseMs;

  if (elapsed < SETTINGS.minDurationMs) {
    await page.waitForTimeout(SETTINGS.minDurationMs - elapsed);
  }
}

/*
 * -------------------------------------------------------
 * V6 LOADING INTRO DETECTION
 * -------------------------------------------------------
 *
 * We record the complete video first (native Playwright
 * recorder, unchanged from before — its scroll output is
 * what looks good).
 *
 * Then FFmpeg's signalstats filter analyzes just the
 * beginning of the raw video and finds the exact moment
 * the white loading screen ends and real content paints.
 *
 * IMPORTANT FIX vs the previous version:
 *
 * ffmpeg's `metadata=print` filter, when no `file` option
 * is given, writes to STDERR — not stdout. execFileSync()
 * only returns stdout on a successful run, so the metadata
 * was silently discarded and findReadyTime() always
 * returned 0 (i.e. "no intro to trim"). That's why the
 * white screen never actually got cut.
 *
 * Fix: write directly to a file via `metadata=print:file=...`
 * and read that file back.
 *
 * SECOND FIX:
 *
 * `metadata=print` output is two lines per sampled frame:
 *
 *   frame:12    pts:12      pts_time:0.120000
 *   lavfi.signalstats.YAVG=254.823975
 *
 * pts_time and YAVG are NOT on the same line, so a single
 * combined regex never matched. We now track pts_time from
 * the frame line and pair it with the YAVG value on the
 * following line.
 */
function findReadyTime(webmPath, analysisFileName, analysisDir) {
  // Instead of embedding a full path (with a Windows drive-letter
  // colon) inside the ffmpeg filtergraph string — which turned out
  // to need fragile, version-dependent multi-level escaping — we
  // run ffmpeg with cwd set to analysisDir and pass a bare filename.
  // No slashes or colons ever reach the filter parser.
  const filter =
    `fps=${SETTINGS.analysisFps},` +
    `scale=160:-1,` +
    `signalstats,` +
    `metadata=print:file=${analysisFileName}`;

  const analysisFile = path.join(analysisDir, analysisFileName);

  try {
    execFileSync(
      'ffmpeg',
      [
        '-y',
        '-loglevel',
        'error',

        '-i',
        webmPath,

        '-t',
        String(SETTINGS.maxIntroTrimMs / 1000),

        '-vf',
        filter,

        '-f',
        'null',

        '-',
      ],
      {
        cwd: analysisDir,
        stdio: ['ignore', 'ignore', 'pipe'],
      }
    );
  } catch (error) {
    console.log(
      `          [warn] intro-detection ffmpeg call failed: ${
        error.stderr?.toString().trim() || error.message
      }`
    );

    return 0;
  }

  let raw = '';

  try {
    raw = readFileSync(analysisFile, 'utf8');
  } catch (error) {
    console.log(
      `          [warn] could not read analysis file: ${error.message}`
    );
    return 0;
  }

  const lines = raw.split(/\r?\n/);

  // Each sampled frame produces one "frame:.. pts_time:.." line
  // followed by several "lavfi.signalstats.XXX=..." lines. Group
  // them back into one record per frame before evaluating.
  const frames = [];
  let current = null;

  for (const line of lines) {
    const ptsMatch = line.match(/pts_time:([0-9.]+)/);

    if (ptsMatch) {
      if (current) frames.push(current);

      current = {
        time: Number(ptsMatch[1]),
        ymin: null,
        ymax: null,
        yavg: null,
      };

      continue;
    }

    if (!current) continue;

    const yminMatch = line.match(/lavfi\.signalstats\.YMIN=([0-9.]+)/);
    if (yminMatch) {
      current.ymin = Number(yminMatch[1]);
      continue;
    }

    const ymaxMatch = line.match(/lavfi\.signalstats\.YMAX=([0-9.]+)/);
    if (ymaxMatch) {
      current.ymax = Number(ymaxMatch[1]);
      continue;
    }

    const yavgMatch = line.match(/lavfi\.signalstats\.YAVG=([0-9.]+)/);
    if (yavgMatch) {
      current.yavg = Number(yavgMatch[1]);
      continue;
    }
  }

  if (current) frames.push(current);

  if (process.env.DEBUG_INTRO) {
    console.log(
      `          [debug] parsed ${frames.length} frames, first 20:`
    );

    for (const f of frames.slice(0, 20)) {
      const spread =
        f.ymin != null && f.ymax != null ? f.ymax - f.ymin : null;

      console.log(
        `          [debug]   t=${f.time.toFixed(2)}s  YAVG=${
          f.yavg?.toFixed(1) ?? '?'
        }  spread=${spread?.toFixed(1) ?? '?'}`
      );
    }
  }

  let consecutiveStart = null;

  for (const f of frames) {
    if (f.ymin == null || f.ymax == null || f.yavg == null) continue;

    const spread = f.ymax - f.ymin;

    const isContent = spread >= SETTINGS.minContentSpread;

    if (isContent) {
      if (consecutiveStart === null) {
        consecutiveStart = f.time;
      }

      const heldFor = f.time - consecutiveStart;

      if (heldFor >= SETTINGS.readyConfirmationMs / 1000) {
        // If content was already visible essentially from frame 0,
        // there's no intro to trim.
        if (consecutiveStart <= 0.05) {
          return 0;
        }

        return (
          consecutiveStart + SETTINGS.introForwardBufferMs / 1000
        );
      }
    } else {
      consecutiveStart = null;
    }
  }

  return 0;
}

async function trimIntro(rawPath, finalPath, analysisFileName, analysisDir) {
  const readyTime = findReadyTime(rawPath, analysisFileName, analysisDir);

  console.log(
    `          Detected loading intro: ${readyTime.toFixed(2)}s`
  );

  /*
   * If there is effectively no white intro,
   * simply convert the raw video.
   */
  if (readyTime < 0.15) {
    execFileSync(
      'ffmpeg',
      [
        '-y',
        '-loglevel',
        'error',

        '-i',
        rawPath,

        '-c:v',
        'libx264',

        '-preset',
        'veryfast',

        '-crf',
        '23',

        '-pix_fmt',
        'yuv420p',

        '-movflags',
        '+faststart',

        '-an',

        finalPath,
      ],
      {
        stdio: 'inherit',
      }
    );

    return;
  }

  /*
   * Accurate post-recording trim.
   *
   * The recorded frames are untouched — we are only
   * removing the beginning, and re-encoding (not -c copy)
   * so the -ss cut lands on an exact frame instead of the
   * nearest keyframe.
   */
  execFileSync(
    'ffmpeg',
    [
      '-y',
      '-loglevel',
      'error',

      '-i',
      rawPath,

      '-ss',
      readyTime.toFixed(3),

      '-c:v',
      'libx264',

      '-preset',
      'veryfast',

      '-crf',
      '23',

      '-pix_fmt',
      'yuv420p',

      '-movflags',
      '+faststart',

      '-an',

      finalPath,
    ],
    {
      stdio: 'inherit',
    }
  );
}

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.mkdir(RAW_DIR, { recursive: true });

  const batch = await loadBatch();

  if (!ffmpegAvailable()) {
    throw new Error(
      'FFmpeg is required. Make sure "ffmpeg" works in a new terminal.'
    );
  }

  const browser = await chromium.launch({ headless: true });

  const results = [];

  console.log('\n========================================');
  console.log('Dental Website Batch Recorder V6');
  console.log('Resolution: 1280x720');
  console.log(
    'Native Playwright recording + fixed automatic intro trim'
  );
  console.log('========================================\n');

  try {
    for (let i = 0; i < batch.length; i++) {
      const item = batch[i];

      const base = safeName(item.name);

      const rawPath = path.join(RAW_DIR, `${base}.webm`);
      const finalPath = path.join(OUTPUT_DIR, `${base}.mp4`);

      // Bare filename only — kept separate from its directory so
      // ffmpeg can be run with cwd set to analysisDir and never see
      // a path (avoids the Windows drive-letter-colon / filtergraph
      // escaping problem entirely).
      const analysisDir = os.tmpdir();
      const analysisFileName = `intro-analysis-${base}-${process.pid}-${i}.txt`;
      const analysisFile = path.join(analysisDir, analysisFileName);

      console.log(`[${i + 1}/${batch.length}] ${item.name}`);
      console.log(`          ${item.url}`);

      const context = await browser.newContext({
        viewport: {
          width: SETTINGS.width,
          height: SETTINGS.height,
        },

        deviceScaleFactor: SETTINGS.deviceScaleFactor,

        /*
         * Native Playwright video recording — kept because
         * its scrolling output looks better than the
         * screenshot-stitching approach.
         */
        recordVideo: {
          dir: RAW_DIR,

          size: {
            width: SETTINGS.width,
            height: SETTINGS.height,
          },
        },
      });

      const page = await context.newPage();

      let ok = false;

      try {
        await page.goto(item.url, {
          waitUntil: 'domcontentloaded',
          timeout: SETTINGS.loadTimeoutMs,
        });

        /*
         * networkidle is only a supporting signal — the real
         * "is it actually loaded" check now happens after
         * recording, via findReadyTime().
         */
        await page
          .waitForLoadState('networkidle', {
            timeout: SETTINGS.networkIdleTimeoutMs,
          })
          .catch(() => {});

        await preparePage(page);

        await walkthrough(page);

        ok = true;
      } catch (error) {
        console.error(`          FAILED: ${error.message}`);
      } finally {
        /*
         * Closing the page/context finishes the native
         * Playwright recording.
         */
        await page.close().catch(() => {});

        const video = page.video();

        await context.close().catch(() => {});

        if (video) {
          const generated = await video.path().catch(() => null);

          if (generated) {
            await fs.rename(generated, rawPath).catch(async () => {
              await fs.copyFile(generated, rawPath);
            });
          }
        }
      }

      if (!ok) {
        results.push({
          name: item.name,
          status: 'failed',
        });

        await fs.unlink(rawPath).catch(() => {});

        continue;
      }

      /*
       * ------------------------------------------------
       * POST-PROCESSING
       * ------------------------------------------------
       *
       * Recording is complete. We inspect only the
       * beginning of it and remove the white loading
       * portion.
       */
      try {
        console.log('          Analyzing loading intro...');

        await trimIntro(rawPath, finalPath, analysisFileName, analysisDir);

        await fs.unlink(rawPath).catch(() => {});
        await fs.unlink(analysisFile).catch(() => {});

        results.push({
          name: item.name,
          status: 'success',
          file: finalPath,
        });

        console.log(`          SAVED: ${finalPath}\n`);
      } catch (error) {
        console.error(`          MP4 processing failed: ${error.message}`);

        /*
         * Keep the original recording instead of losing the
         * website video entirely.
         */
        const fallback = path.join(OUTPUT_DIR, `${base}.webm`);

        await fs.rename(rawPath, fallback).catch(() => {});

        results.push({
          name: item.name,
          status: 'success-webm',
          file: fallback,
          error: error.message,
        });

        console.log(`          RAW WEBM KEPT: ${fallback}\n`);
      }
    }
  } finally {
    await browser.close().catch(() => {});
  }

  const successful = results.filter((r) =>
    r.status.startsWith('success')
  ).length;

  const failed = results.length - successful;

  console.log('========================================');
  console.log(`Finished: ${successful}/${batch.length} recordings saved`);

  if (failed) {
    console.log(`Failed: ${failed}`);
  }

  console.log('========================================\n');
}

main().catch((error) => {
  console.error('ERROR:', error.message);
  process.exit(1);
});