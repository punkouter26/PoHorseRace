/**
 * ballPhysics.test.ts — Rapier physics containment tests for PoHorseRace.
 *
 * Verified behaviours:
 *  Suite P — Ball settle & containment (game route /game)
 *
 *    P1  All 3 balls remain in InTrough phase after physics settle
 *        (confirms store phase consistency — no spurious launches)
 *
 *    P2  Rapier Y positions are within the valid ramp-surface band
 *        (Y > −3.0 && Y < 1.0)
 *        → proves balls did NOT fall through the ramp plane
 *
 *    P3  Rapier Z positions are within the ramp extent
 *        (3.0 < Z < 7.5)
 *        → proves balls did NOT roll off the backstop-less player end
 *          (backstop wall added at RAMP_LEN/2 in PoLaneRamp; world Z ≈ 5.33)
 *
 *    P4  Rapier X positions stay within the lane 1 corridor
 *        (−5.5 < X < −2.0)
 *        → proves balls did NOT drift sideways through the gutter walls
 *
 *    P5  Ball positions are stable across a 1-second window after settling
 *        (|ΔZ| < 0.20 per ball over 1 s)
 *        → proves the backstop is actively holding the balls still
 *
 *    P6  No uncaught JS exceptions during the full settle period
 *
 * World-space expectations (derived from PoLaneRamp / PoTrough constants):
 *  Lane 1 world X        : −3.5
 *  Ramp near-end world Y : ≈ −0.49  (RAMP_CENTER_Y − (RAMP_LEN/2)·sin 10°)
 *  Backstop world Z      : ≈  5.33  (RAMP_CENTER_Z + (RAMP_LEN/2)·cos 10°)
 *
 * Note: uses window.__poTestBridge.getBallPhysicsPositions() which reads live
 * RapierRigidBody.translation() values via PoBallRegistry (populated by PoBall
 * on mount / cleared on unmount).
 */

import { test, expect, type Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PoTestBridge {
  getRacePhase:             () => string;
  getBalls:                 () => Array<{ id: number; phase: string }>;
  getBallPhysicsPositions:  () => Array<{ id: number; x: number; y: number; z: number }>;
}

// ---------------------------------------------------------------------------
// World-space containment bounds
// (generous enough to survive physics jitter, tight enough to catch real failures)
// ---------------------------------------------------------------------------

/** Below −3 the ball has clearly fallen through or left the ramp entirely. */
const Y_MIN = -3.0;
/** Above 1.0 the ball has launched upward — not physically possible at rest. */
const Y_MAX =  1.0;

/**
 * Z in world space: ramp spans from ~2.1 (far/scoring end) to ~5.33 (backstop).
 * Allow a 1-unit buffer each side.
 */
const Z_MIN =  3.0;
const Z_MAX =  7.5;

/**
 * Lane 1 centre X is currently ≈ −9.24 (PoHorseWall lane layout).
 * Allow a generous corridor around lane 1 gutters for physics jitter.
 */
const X_MIN = -11.5;
const X_MAX = -7.0;

/** Max |ΔZ| per ball between two readings 1 s apart (ball is considered settled). */
const STABILITY_DELTA = 0.20;

// Physics settle time — gives Rapier enough frames to push balls against backstop.
const SETTLE_MS = 3_500;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function waitForCanvas(page: Page): Promise<void> {
  await page.waitForSelector('canvas', { timeout: 12_000 });
  await page.waitForTimeout(SETTLE_MS);
}

async function waitForBridge(page: Page): Promise<void> {
  await page.waitForFunction(
    () =>
      typeof (
        window as unknown as { __poTestBridge?: unknown }
      ).__poTestBridge !== 'undefined',
    { timeout: 12_000 },
  );
}

/** Read a value synchronously from the test bridge. */
async function bridge<T>(page: Page, fn: (b: PoTestBridge) => T): Promise<T> {
  return page.evaluate(
    (fnStr) => {
      const b = (
        window as unknown as { __poTestBridge: PoTestBridge }
      ).__poTestBridge;
      // eslint-disable-next-line no-new-func
      return new Function('b', `return (${fnStr})(b)`)(b) as T;
    },
    fn.toString(),
  );
}

/** Navigate to the game, wait for bridge + physics settle. */
async function loadGame(page: Page): Promise<void> {
  await page.goto('/game');
  await waitForBridge(page);
  await waitForCanvas(page);
}

// ---------------------------------------------------------------------------
// Suite P — Ball settle & containment
// ---------------------------------------------------------------------------

test.describe('Suite P — ball physics: settle and containment', () => {

  // ── P1 ──────────────────────────────────────────────────────────────────
  test('P1 — all 3 balls remain InTrough after physics settle', async ({ page }) => {
    await loadGame(page);

    const balls = await bridge(page, b => b.getBalls());

    expect(balls, 'store should contain exactly 3 balls').toHaveLength(3);
    for (const ball of balls) {
      expect(
        ball.phase,
        `ball ${ball.id} unexpectedly left InTrough (phase="${ball.phase}")`,
      ).toBe('InTrough');
    }
  });

  // ── P2 ──────────────────────────────────────────────────────────────────
  test('P2 — Rapier Y positions are within the valid ramp-surface band', async ({ page }) => {
    await loadGame(page);

    const positions = await bridge(page, b => b.getBallPhysicsPositions());

    expect(positions.length, 'expected 3 registered ball bodies').toBeGreaterThanOrEqual(3);

    for (const pos of positions) {
      expect(
        pos.y,
        `ball ${pos.id} Y=${pos.y.toFixed(3)} — fell BELOW ramp plane (threshold ${Y_MIN})`,
      ).toBeGreaterThan(Y_MIN);

      expect(
        pos.y,
        `ball ${pos.id} Y=${pos.y.toFixed(3)} — above valid ramp range (threshold ${Y_MAX})`,
      ).toBeLessThan(Y_MAX);
    }
  });

  // ── P3 ──────────────────────────────────────────────────────────────────
  test('P3 — Rapier Z positions are within the ramp extent (backstop holding)', async ({ page }) => {
    await loadGame(page);

    const positions = await bridge(page, b => b.getBallPhysicsPositions());

    expect(positions.length).toBeGreaterThanOrEqual(3);

    for (const pos of positions) {
      expect(
        pos.z,
        `ball ${pos.id} Z=${pos.z.toFixed(3)} — rolled BACK past player end (threshold ${Z_MAX}); backstop may be missing`,
      ).toBeLessThan(Z_MAX);

      expect(
        pos.z,
        `ball ${pos.id} Z=${pos.z.toFixed(3)} — too close to scoring end (threshold ${Z_MIN})`,
      ).toBeGreaterThan(Z_MIN);
    }
  });

  // ── P4 ──────────────────────────────────────────────────────────────────
  test('P4 — Rapier X positions stay within the lane 1 corridor', async ({ page }) => {
    await loadGame(page);

    const positions = await bridge(page, b => b.getBallPhysicsPositions());

    expect(positions.length).toBeGreaterThanOrEqual(3);

    for (const pos of positions) {
      expect(
        pos.x,
        `ball ${pos.id} X=${pos.x.toFixed(3)} — escaped lane via LEFT gutter (threshold ${X_MIN})`,
      ).toBeGreaterThan(X_MIN);

      expect(
        pos.x,
        `ball ${pos.id} X=${pos.x.toFixed(3)} — escaped lane via RIGHT gutter (threshold ${X_MAX})`,
      ).toBeLessThan(X_MAX);
    }
  });

  // ── P5 ──────────────────────────────────────────────────────────────────
  test('P5 — ball positions are stable (backstop actively holding, |ΔZ| < 0.20 over 1s)', async ({ page }) => {
    await loadGame(page);

    // First snapshot (balls should be fully settled by now after SETTLE_MS)
    const snap1 = await bridge(page, b => b.getBallPhysicsPositions());

    // Wait 1 more second then sample again
    await page.waitForTimeout(1_000);
    const snap2 = await bridge(page, b => b.getBallPhysicsPositions());

    expect(snap1.length).toBeGreaterThanOrEqual(3);
    expect(snap2.length).toBeGreaterThanOrEqual(3);

    for (const before of snap1) {
      const after = snap2.find(p => p.id === before.id);
      if (!after) continue;

      const deltaZ = Math.abs(after.z - before.z);
      expect(
        deltaZ,
        `ball ${before.id} still rolling: Z moved ${deltaZ.toFixed(3)} world units in 1 s (max ${STABILITY_DELTA}); backstop may not be blocking`,
      ).toBeLessThan(STABILITY_DELTA);

      const deltaY = Math.abs(after.y - before.y);
      expect(
        deltaY,
        `ball ${before.id} still bouncing: Y moved ${deltaY.toFixed(3)} world units in 1 s (max ${STABILITY_DELTA})`,
      ).toBeLessThan(STABILITY_DELTA);
    }
  });

  // ── P6 ──────────────────────────────────────────────────────────────────
  test('P6 — no uncaught JS exceptions during settle period', async ({ page }) => {
    const errors: Error[] = [];
    page.on('pageerror', err => errors.push(err));

    await loadGame(page); // already waits SETTLE_MS

    if (errors.length > 0) {
      console.log('Uncaught exceptions during settle:');
      errors.forEach(e => console.log(' •', e.message));
    }

    expect(errors).toHaveLength(0);
  });

});
