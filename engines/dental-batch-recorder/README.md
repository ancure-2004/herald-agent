# Dental Batch Recorder

Records a batch of deployed clinic websites as clean, natural-looking browser walkthroughs.

## What changed in this version

- No artificial 4-second pre-scroll delay.
- Smooth continuous scrolling instead of jumping between section positions.
- Target duration: 35–55 seconds per website (default ~45 seconds).
- 1920×1080 recording viewport.
- Short human-like pauses at meaningful section boundaries.
- Slightly varied scroll speed so the motion does not look robotic.
- Waits for fonts/images before starting the walkthrough.
- Saves MP4 when FFmpeg is installed; otherwise keeps WebM.
- One failed site does not stop the batch.

## Setup

```bash
npm install
npx playwright install chromium
```

Install FFmpeg and make sure `ffmpeg` is available on PATH if you want MP4 output.

Put today's websites in `batch.json`:

```json
[
  {"name":"Clinic-71","url":"https://your-site.vercel.app"},
  {"name":"Clinic-72","url":"https://your-site.vercel.app"}
]
```

Then:

```bash
npm run record
```

Outputs go into `recordings/`.

## Recording behavior

The recorder:

1. Opens the website.
2. Waits for the page, fonts and images to settle.
3. Starts the visible walkthrough almost immediately (about 1 second at the top).
4. Scrolls continuously, at a natural speed, rather than jumping.
5. Briefly pauses around section boundaries.
6. Reaches the footer and holds briefly.
7. Saves the recording and moves to the next site.

The target is adaptive: short pages are stretched to at least ~35 seconds and long pages are capped around ~55 seconds.

## Notes

The recorder captures the website viewport, not the Windows desktop or browser chrome. This keeps outreach videos clean and consistent.
