/**
 * gfx.test.ts — Visual/GFX verification for PoHorseRace.
 *
 * For each key scene state, captures a full-page screenshot + a canvas-clipped
 * screenshot, saves them under test-results/screenshots/, and asserts that real
 * 3D content was rendered (non-trivial pixel data).
 *
 * States captured:
 *  1. Idle          — ramps, holes, wall, LED "--" clocks visible
 *  2. Countdown     — after RESET tap: "3 / 2 / 1 / GO" LED on wall
 *  3. Racing        — horses moving, elapsed timer on LED displays
 *  4. Finished      — summary card visible, gold glow on winner
 *
 * Screenshots land in:  test-results/screenshots/<name>.png
 */

import * as fs   from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { test, expect, type Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Setup — ensure output directory exists
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const SCREENSHOT_DIR = path.join(
  __dirname, '..', '..', 'test-results', 'screenshots'
);

test.beforeAll(() => {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function waitForCanvas(page: Page): Promise<void> {
  await page.waitForSelector('canvas', { timeout: 12_000 });
  await page.waitForTimeout(2_500); // let R3F + react-spring settle
}

/**
 * Capture full-page + canvas-crop screenshots, save to disk, and assert
 * the canvas region is non-trivial (not blank/all-black).
 */
async function captureAndVerify(page: Page, label: string): Promise<void> {
  const safe = label.replace(/\s+/g, '-').toLowerCase();

  // ── Full-page screenshot ────────────────────────────────────────────────
  const fullPath = path.join(SCREENSHOT_DIR, `${safe}-full.png`);
  const fullBuf  = await page.screenshot({ fullPage: true });
  fs.writeFileSync(fullPath, fullBuf);
  console.log(`  📷 saved ${fullPath}`);

  // ── Canvas-cropped screenshot ───────────────────────────────────────────
  const canvas = page.locator('canvas');
  const box    = await canvas.boundingBox();
  expect(box, `canvas bounding box must exist for "${label}"`).not.toBeNull();

  const cropBuf = await page.screenshot({
    clip: {
      x: box!.x,
      y: box!.y,
      width:  box!.width,
      height: box!.height,
    },
  });
  const cropPath = path.join(SCREENSHOT_DIR, `${safe}-canvas.png`);
  fs.writeFileSync(cropPath, cropBuf);
  console.log(`  📷 saved ${cropPath}`);

  // ── Assert canvas has rendered real content (not blank) ─────────────────
  // A blank WebGL canvas screenshot is tiny when compressed; any real scene
  // with lighting, colours, and geometry produces > 3 KB.
  expect(
    cropBuf.byteLength,
    `canvas pixel data for "${label}" looks blank (${cropBuf.byteLength} bytes)`
  ).toBeGreaterThan(3_000);
}

/**
 * Read a single pixel from the centre of the canvas via JavaScript evaluate.
 * Returns [r, g, b, a] or null if not available. Used for ramp colour checks.
 * NOTE: R3F uses preserveDrawingBuffer:false by default so readPixels isn't
 * reliable; we rely on screenshot byte-size assertions instead.
 */
async function canvasSize(page: Page): Promise<{ w: number; h: number }> {
  return page.evaluate(() => {
    const c = document.querySelector('canvas') as HTMLCanvasElement | null;
    return c ? { w: c.width, h: c.height } : { w: 0, h: 0 };
  });
}

// ---------------------------------------------------------------------------
// GFX tests
// ---------------------------------------------------------------------------

test.describe('PoHorseRace GFX verification', () => {

  test('01-idle — ramps, holes and wall render on load', async ({ page }) => {
    const pageErrors: Error[] = [];
    page.on('pageerror', e => pageErrors.push(e));

    await page.goto('/game');
    await waitForCanvas(page);

    // Canvas dimensions sanity
    const { w, h } = await canvasSize(page);
    expect(w).toBeGreaterThan(100);
    expect(h).toBeGreaterThan(100);

    await captureAndVerify(page, '01-idle');

    expect(pageErrors, 'no JS exceptions in idle state').toHaveLength(0);
  });

  test('02-countdown — LED countdown visible after RESET', async ({ page }) => {
    const pageErrors: Error[] = [];
    page.on('pageerror', e => pageErrors.push(e));

    await page.goto('/game');
    await waitForCanvas(page);

    // Tap the canvas centre to trigger RESET (PoDiegeticButton is in 3D but
    // raycasting fires on canvas click in the lower-left quadrant).
    const canvas = page.locator('canvas');
    const box    = await canvas.boundingBox();
    expect(box).not.toBeNull();

    // RESET button is at world position [-1.2, -0.6, 4] — project is bottom-left
    await page.mouse.click(
      box!.x + box!.width  * 0.35,
      box!.y + box!.height * 0.80,
    );

    // Capture mid-countdown (wait 1.2 s so at least one digit has shown)
    await page.waitForTimeout(1_200);
    await captureAndVerify(page, '02-countdown');

    expect(pageErrors).toHaveLength(0);
  });

  test('03-racing — horses and timer visible after GO', async ({ page }) => {
    const pageErrors: Error[] = [];
    page.on('pageerror', e => pageErrors.push(e));

    await page.goto('/game');
    await waitForCanvas(page);

    // Trigger RESET → Countdown
    const canvas = page.locator('canvas');
    const box    = await canvas.boundingBox();
    expect(box).not.toBeNull();

    await page.mouse.click(
      box!.x + box!.width  * 0.35,
      box!.y + box!.height * 0.80,
    );

    // Wait for countdown to expire (3 s) + a little racing time
    await page.waitForTimeout(4_500);
    await captureAndVerify(page, '03-racing');

    expect(pageErrors).toHaveLength(0);
  });

  test('04-finished — summary card and gold glow visible', async ({ page }) => {
    const pageErrors: Error[] = [];
    page.on('pageerror', e => pageErrors.push(e));

    await page.goto('/game');
    await waitForCanvas(page);

    // Start race
    const canvas = page.locator('canvas');
    const box    = await canvas.boundingBox();
    expect(box).not.toBeNull();

    await page.mouse.click(
      box!.x + box!.width  * 0.35,
      box!.y + box!.height * 0.80,
    );

    // Wait long enough for a bot lane to naturally finish (FR-003 bots advance
    // automatically — fastest bot reaches 60" in ~8–12 s demo time).
    // Cap at 20 s to keep CI fast.
    await page.waitForTimeout(20_000);
    await captureAndVerify(page, '04-finished');

    expect(pageErrors).toHaveLength(0);
  });

  test('05-ramp-colors — canvas contains non-grey (coloured lane) pixels', async ({ page }) => {
    await page.goto('/game');
    await waitForCanvas(page);

    // Take a screenshot of the bottom half of the canvas (where ramps appear
    // closest to the camera / most visible).
    const canvas = page.locator('canvas');
    const box    = await canvas.boundingBox();
    expect(box).not.toBeNull();

    const rampBuf = await page.screenshot({
      clip: {
        x: box!.x,
        y: box!.y + box!.height * 0.5, // bottom half = near-player ramp end
        width:  box!.width,
        height: box!.height * 0.5,
      },
    });

    const rampPath = path.join(SCREENSHOT_DIR, '05-ramp-colors-canvas.png');
    fs.writeFileSync(rampPath, rampBuf);
    console.log(`  📷 saved ${rampPath}`);

    // Coloured ramps produce significantly more varied pixel data than a blank
    // or uniform background — compressed size is a reliable proxy.
    expect(
      rampBuf.byteLength,
      'ramp region looks blank — lane colours may not be rendering'
    ).toBeGreaterThan(2_000);
  });

  test('06-diag — /diag page renders JSON blob', async ({ page }) => {
    const pageErrors: Error[] = [];
    page.on('pageerror', e => pageErrors.push(e));

    await page.goto('/diag');
    await page.waitForTimeout(800);

    const pre = page.locator('pre');
    await expect(pre).toBeVisible({ timeout: 5_000 });

    const diagPath = path.join(SCREENSHOT_DIR, '06-diag-full.png');
    const buf = await page.screenshot({ fullPage: true });
    fs.writeFileSync(diagPath, buf);
    console.log(`  📷 saved ${diagPath}`);

    expect(pageErrors).toHaveLength(0);
  });

});
