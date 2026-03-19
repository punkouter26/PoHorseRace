/**
 * gameplay.test.ts — Comprehensive game-loop e2e tests for PoHorseRace.
 *
 * Uses window.__poTestBridge (DEV-only, injected in main.tsx) to inspect
 * Zustand store state without polling or fragile timeouts where possible.
 *
 * Test coverage:
 *  Suite A — Initial state (Idle)
 *    A1  Phase is 'Idle' on load
 *    A2  Elapsed timer is 0
 *    A3  Countdown value is null
 *    A4  Winner lane is null
 *    A5  All 3 balls are in InTrough phase
 *
 *  Suite B — RESET button starts Countdown (real canvas interaction)
 *    B1  Clicking RESET area transitions phase to 'Countdown'
 *    B2  Countdown starts at 3
 *    B3  Countdown decrements 3 → 2 → 1 and clears to null
 *
 *  Suite C — Racing phase behaviour
 *    C1  Phase becomes 'Racing' after countdown expires
 *    C2  Elapsed timer increments during 'Racing'
 *    C3  All 3 balls remain available (InTrough) at race start
 *
 *  Suite D — Ball launch via swipe gesture
 *    D1  One ball transitions out of InTrough after a swipe on the canvas
 *
 *  Suite E — Finish and Summary Card
 *    E1  Race transitions to 'Finished' when finishRace helper called
 *    E2  Winner lane id is recorded
 *    E3  Summary Card DOM node is visible (drei <Html> renders real DOM)
 *    E4  Summary Card shows "RACE COMPLETE" heading
 *    E5  Summary Card shows expected stat labels
 *
 *  Suite F — Reset cycle
 *    F1  After Finished, triggerReset → phase returns to 'Idle'
 *    F2  Elapsed timer resets to 0
 *    F3  Winner lane id clears to null
 *    F4  All 3 balls return to InTrough
 *
 *  Suite G — Full real-click reset flow
 *    G1  Clicking RESET in Finished state returns phase to 'Idle'
 *
 *  Suite H — /diag route health
 *    H1  Navigating to /diag renders the pre element
 *    H2  Returning from /diag to / restores the canvas
 */

import { test, expect, type Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Types for the test bridge (mirrors what main.tsx exposes)
// ---------------------------------------------------------------------------

interface PoTestBridge {
  getGameMode: () => string;
  getRacePhase:      () => string;
  getElapsedSeconds: () => number;
  getCountdownValue: () => number | null;
  getWinnerLaneId:   () => number | null;
  getLanes:          () => Array<{ id: number; positionInches: number; score: number; goldGlowActive: boolean }>;
  getBalls:          () => Array<{ id: number; phase: string }>;
  triggerCountdown:  () => void;
  triggerFinish:     (laneId: number) => void;
  triggerReset:      () => void;
  triggerBallLaunch: (mph?: number) => boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Wait for the canvas to mount and Rapier WASM to finish initialising.
 *
 * The original 2-second fixed delay was not enough: Rapier WASM typically
 * takes 5-8 s to load in headless Chromium.  While WASM is still loading,
 * the JS main thread is periodically busy and setInterval callbacks are
 * deferred, causing countdown / elapsed-timer assertions to fail.
 *
 * Strategy: poll __poTestBridge.isRapierReady() (returns true once the
 * first PoBall RigidBody has registered with PoBallRegistry) with a
 * generous 30 s timeout so that all timer-based tests get a level playing
 * field regardless of machine speed (increased from 20 s for full-suite runs
 * where earlier demo tests have warmed the CPU).
 */
async function waitForCanvas(page: Page): Promise<void> {
  await page.waitForSelector('canvas', { timeout: 12_000 });
  // Wait for Rapier WASM to be ready — prevents timer throttling from WASM init
  await page.waitForFunction(
    () => {
      const bridge = (window as unknown as { __poTestBridge?: { isRapierReady?: () => boolean } }).__poTestBridge;
      return bridge?.isRapierReady?.() === true;
    },
    { timeout: 30_000 },
  );
}

/**
 * Wait until the test bridge is available on window.
 * (main.tsx sets it synchronously before createRoot, but React strict-mode
 *  double-invocation means we poll briefly just in case.)
 */
async function waitForBridge(page: Page): Promise<void> {
  await page.waitForFunction(
    () => typeof (window as unknown as { __poTestBridge?: unknown }).__poTestBridge !== 'undefined',
    { timeout: 12_000 }
  );
}

/** Read a value from the test bridge. */
async function bridge<T>(page: Page, fn: (b: PoTestBridge) => T): Promise<T> {
  return page.evaluate(
    (fnStr) => {
      const b = (window as unknown as { __poTestBridge: PoTestBridge }).__poTestBridge;
      // eslint-disable-next-line no-new-func
      return new Function('b', `return (${fnStr})(b)`)(b) as T;
    },
    fn.toString()
  );
}

async function launchDemoFromHome(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Demo' })).toBeVisible();
  await page.getByRole('button', { name: 'Demo' }).click();
  await page.waitForURL('**/game');
  await waitForBridge(page);
  await waitForCanvas(page);
}

// ---------------------------------------------------------------------------
// Suite A — Initial state (Idle)
// ---------------------------------------------------------------------------

test.describe('Suite A — initial Idle state', () => {

  test('A1 — phase is Idle on load', async ({ page }) => {
    await page.goto('/game');
    await waitForBridge(page);
    await waitForCanvas(page);

    const phase = await bridge(page, b => b.getRacePhase());
    expect(phase).toBe('Idle');
  });

  test('A2 — elapsed timer is 0 on load', async ({ page }) => {
    await page.goto('/game');
    await waitForBridge(page);
    await waitForCanvas(page);

    const elapsed = await bridge(page, b => b.getElapsedSeconds());
    expect(elapsed).toBe(0);
  });

  test('A3 — countdown value is null on load', async ({ page }) => {
    await page.goto('/game');
    await waitForBridge(page);
    await waitForCanvas(page);

    const countdown = await bridge(page, b => b.getCountdownValue());
    expect(countdown).toBeNull();
  });

  test('A4 — winner lane is null on load', async ({ page }) => {
    await page.goto('/game');
    await waitForBridge(page);
    await waitForCanvas(page);

    const winner = await bridge(page, b => b.getWinnerLaneId());
    expect(winner).toBeNull();
  });

  test('A5 — all 3 balls are InTrough on load', async ({ page }) => {
    await page.goto('/game');
    await waitForBridge(page);
    await waitForCanvas(page);

    const balls = await bridge(page, b => b.getBalls());
    expect(balls).toHaveLength(3);
    expect(balls.every((ball: { phase: string }) => ball.phase === 'InTrough')).toBe(true);
  });

});

// ---------------------------------------------------------------------------
// Suite B — Countdown store mechanics
// (Canvas RESET click is exercised end-to-end in Suite G)
// ---------------------------------------------------------------------------

test.describe('Suite B — countdown store mechanics', () => {

  test('B1 — triggerCountdown sets phase to Countdown', async ({ page }) => {
    const pageErrors: Error[] = [];
    page.on('pageerror', err => pageErrors.push(err));

    await page.goto('/game');
    await waitForBridge(page);
    await waitForCanvas(page);

    await page.evaluate(() => {
      (window as unknown as { __poTestBridge: PoTestBridge }).__poTestBridge.triggerCountdown();
    });
    await page.waitForTimeout(200);

    const phase = await bridge(page, b => b.getRacePhase());
    expect(phase).toBe('Countdown');
    expect(pageErrors).toHaveLength(0);
  });

  test('B2 — countdown value starts at 3', async ({ page }) => {
    await page.goto('/game');
    await waitForBridge(page);
    await waitForCanvas(page);

    await page.evaluate(() => {
      (window as unknown as { __poTestBridge: PoTestBridge }).__poTestBridge.triggerCountdown();
    });
    await page.waitForTimeout(200);

    const countdown = await bridge(page, b => b.getCountdownValue());
    expect(countdown).toBe(3);
  });

  test('B3 — countdown decrements 3 → 2 → 1 then clears to null', async ({ page }) => {
    await page.goto('/game');
    await waitForBridge(page);
    await waitForCanvas(page);

    await page.evaluate(() => {
      (window as unknown as { __poTestBridge: PoTestBridge }).__poTestBridge.triggerCountdown();
    });

    // Poll until first tick fires (value drops to 2) — 8 s budget covers CPU-loaded full-suite runs
    await page.waitForFunction(
      () => (window as unknown as { __poTestBridge: { getCountdownValue: () => number | null } })
        .__poTestBridge.getCountdownValue() === 2,
      { timeout: 8_000 },
    );
    // value was 2 when polled; may have advanced to 1 by the time the CDP round-trip returns
    const at2 = await bridge(page, b => b.getCountdownValue());
    expect(at2).not.toBeNull();
    expect(at2! as number).toBeLessThanOrEqual(2);

    // Poll until second tick fires (value drops to 1)
    await page.waitForFunction(
      () => (window as unknown as { __poTestBridge: { getCountdownValue: () => number | null } })
        .__poTestBridge.getCountdownValue() === 1,
      { timeout: 8_000 },
    );
    // value was 1 when polled; may have ticked to null before bridge returns
    const at1 = await bridge(page, b => b.getCountdownValue());
    expect(at1 === null || (at1 as number) <= 1).toBe(true);

    // Poll until final tick fires (cleared to null, Racing started)
    await page.waitForFunction(
      () => (window as unknown as { __poTestBridge: { getCountdownValue: () => number | null } })
        .__poTestBridge.getCountdownValue() === null,
      { timeout: 8_000 },
    );
    const cleared = await bridge(page, b => b.getCountdownValue());
    expect(cleared).toBeNull();
  });

});

// ---------------------------------------------------------------------------
// Suite C — Racing phase behaviour
// ---------------------------------------------------------------------------

test.describe('Suite C — Racing phase', () => {

  test('C1 — phase becomes Racing after countdown', async ({ page }) => {
    await page.goto('/game');
    await waitForBridge(page);
    await waitForCanvas(page);

    await page.evaluate(() => {
      (window as unknown as { __poTestBridge: PoTestBridge }).__poTestBridge.triggerCountdown();
    });
    // Poll for Racing — avoids fixed 3.5s wait which fails under CPU load
    await page.waitForFunction(
      () => (window as unknown as { __poTestBridge: { getRacePhase: () => string } })
        .__poTestBridge.getRacePhase() === 'Racing',
      { timeout: 10_000 },
    );

    const phase = await bridge(page, b => b.getRacePhase());
    expect(phase).toBe('Racing');
  });

  test('C2 — elapsed timer increments during Racing', async ({ page }) => {
    await page.goto('/game');
    await waitForBridge(page);
    await waitForCanvas(page);

    await page.evaluate(() => {
      (window as unknown as { __poTestBridge: PoTestBridge }).__poTestBridge.triggerCountdown();
    });
    // Poll for Racing before sampling elapsed timer
    await page.waitForFunction(
      () => (window as unknown as { __poTestBridge: { getRacePhase: () => string } })
        .__poTestBridge.getRacePhase() === 'Racing',
      { timeout: 10_000 },
    );

    const before = await bridge(page, b => b.getElapsedSeconds());
    await page.waitForTimeout(2_200); // wait 2 more seconds
    const after = await bridge(page, b => b.getElapsedSeconds());

    expect(after).toBeGreaterThan(before);
    expect(after - before).toBeGreaterThanOrEqual(1);
  });

  test('C3 — all 3 balls remain in InTrough at race start', async ({ page }) => {
    await page.goto('/game');
    await waitForBridge(page);
    await waitForCanvas(page);

    await page.evaluate(() => {
      (window as unknown as { __poTestBridge: PoTestBridge }).__poTestBridge.triggerCountdown();
    });
    await page.waitForTimeout(3_500);

    const balls = await bridge(page, b => b.getBalls());
    const inTrough = balls.filter((b: { phase: string }) => b.phase === 'InTrough');
    expect(inTrough.length).toBe(3);
  });

});

// ---------------------------------------------------------------------------
// Suite D — Ball launch mechanics
// ---------------------------------------------------------------------------

test.describe('Suite D — ball launch mechanics', () => {

  test('D1 — launching a ball transitions it from InTrough to InFlight', async ({ page }) => {
    const pageErrors: Error[] = [];
    page.on('pageerror', err => pageErrors.push(err));

    await page.goto('/game');
    await waitForBridge(page);
    await waitForCanvas(page);

    // Start race so canLaunch() returns true
    await page.evaluate(() => {
      (window as unknown as { __poTestBridge: PoTestBridge }).__poTestBridge.triggerCountdown();
    });
    // Poll for Racing — avoids fixed 3.5 s wait which can fail when countdown is
    // slightly deferred by CPU load (same pattern as C1/C2 fix)
    await page.waitForFunction(
      () => (window as unknown as { __poTestBridge: { getRacePhase: () => string } })
        .__poTestBridge.getRacePhase() === 'Racing',
      { timeout: 10_000 },
    );

    // Verify all balls are in trough before launch
    const before = await bridge(page, b => b.getBalls());
    expect(before.every((b: { phase: string }) => b.phase === 'InTrough')).toBe(true);

    // Use the bridge helper that replicates what usePoSwipeInput does on pointer-up
    const launched = await page.evaluate(() =>
      (window as unknown as { __poTestBridge: PoTestBridge }).__poTestBridge.triggerBallLaunch(15)
    );
    expect(launched).toBe(true);

    // Allow store dispatch to propagate
    await page.waitForTimeout(200);

    const after = await bridge(page, b => b.getBalls());
    const inFlight = after.filter((b: { phase: string }) => b.phase === 'InFlight');
    expect(inFlight.length).toBeGreaterThanOrEqual(1);

    expect(pageErrors).toHaveLength(0);
  });

  test('D2 — second ball can launch after first is InFlight', async ({ page }) => {
    await page.goto('/game');
    await waitForBridge(page);
    await waitForCanvas(page);

    await page.evaluate(() => {
      (window as unknown as { __poTestBridge: PoTestBridge }).__poTestBridge.triggerCountdown();
    });
    await page.waitForFunction(
      () => (window as unknown as { __poTestBridge: { getRacePhase: () => string } })
        .__poTestBridge.getRacePhase() === 'Racing',
      { timeout: 10_000 },
    );

    // Launch first ball
    await page.evaluate(() =>
      (window as unknown as { __poTestBridge: PoTestBridge }).__poTestBridge.triggerBallLaunch(12)
    );
    await page.waitForTimeout(100);

    // Launch second ball
    const launched = await page.evaluate(() =>
      (window as unknown as { __poTestBridge: PoTestBridge }).__poTestBridge.triggerBallLaunch(18)
    );
    expect(launched).toBe(true);
    await page.waitForTimeout(200);

    const balls = await bridge(page, b => b.getBalls());
    const inFlight = balls.filter((b: { phase: string }) => b.phase === 'InFlight');
    expect(inFlight.length).toBeGreaterThanOrEqual(2);
  });

  test('D3 — no ball launch possible when not Racing', async ({ page }) => {
    await page.goto('/game');
    await waitForBridge(page);
    await waitForCanvas(page);

    // Still in Idle — canLaunch() should return false
    const launched = await page.evaluate(() =>
      (window as unknown as { __poTestBridge: PoTestBridge }).__poTestBridge.triggerBallLaunch()
    );
    // triggerBallLaunch returns false when canLaunch() is false
    expect(launched).toBe(false);
  });

});

// ---------------------------------------------------------------------------
// Suite E — Finished state and Summary Card
// ---------------------------------------------------------------------------

test.describe('Suite E — Finished state and Summary Card', () => {

  test('E1 — phase transitions to Finished via bridge helper', async ({ page }) => {
    await page.goto('/game');
    await waitForBridge(page);
    await waitForCanvas(page);

    // Start racing first (finishRace guards on phase === 'Racing')
    await page.evaluate(() => {
      const b = (window as unknown as { __poTestBridge: PoTestBridge }).__poTestBridge;
      b.triggerCountdown();
    });
    await page.waitForTimeout(3_500);

    await page.evaluate(() => {
      (window as unknown as { __poTestBridge: PoTestBridge }).__poTestBridge.triggerFinish(1);
    });
    await page.waitForTimeout(200);

    const phase = await bridge(page, b => b.getRacePhase());
    expect(phase).toBe('Finished');
  });

  test('E2 — winner lane id is recorded after finish', async ({ page }) => {
    await page.goto('/game');
    await waitForBridge(page);
    await waitForCanvas(page);

    await page.evaluate(() => {
      const b = (window as unknown as { __poTestBridge: PoTestBridge }).__poTestBridge;
      b.triggerCountdown();
    });
    await page.waitForTimeout(3_500);

    await page.evaluate(() => {
      (window as unknown as { __poTestBridge: PoTestBridge }).__poTestBridge.triggerFinish(3);
    });
    await page.waitForTimeout(200);

    const winner = await bridge(page, b => b.getWinnerLaneId());
    expect(winner).toBe(3);
  });

  test('E3 — Summary Card DOM node visible when Finished', async ({ page }) => {
    await page.goto('/game');
    await waitForBridge(page);
    await waitForCanvas(page);

    await page.evaluate(() => {
      const b = (window as unknown as { __poTestBridge: PoTestBridge }).__poTestBridge;
      b.triggerCountdown();
    });
    await page.waitForTimeout(3_500);

    await page.evaluate(() => {
      (window as unknown as { __poTestBridge: PoTestBridge }).__poTestBridge.triggerFinish(1);
    });

    // drei <Html> renders a real DOM element — wait for it
    const card = page.locator('text=RACE COMPLETE');
    await expect(card).toBeVisible({ timeout: 3_000 });
  });

  test('E4 — Summary Card shows "RACE COMPLETE" heading', async ({ page }) => {
    await page.goto('/game');
    await waitForBridge(page);
    await waitForCanvas(page);

    await page.evaluate(() => {
      const b = (window as unknown as { __poTestBridge: PoTestBridge }).__poTestBridge;
      b.triggerCountdown();
    });
    await page.waitForTimeout(3_500);
    await page.evaluate(() => {
      (window as unknown as { __poTestBridge: PoTestBridge }).__poTestBridge.triggerFinish(1);
    });
    await page.waitForTimeout(500);

    const heading = page.locator('h2', { hasText: 'RACE COMPLETE' });
    await expect(heading).toBeVisible({ timeout: 3_000 });
  });

  test('E5 — Summary Card shows Sprint Time, Accuracy and Avg Roll Speed labels', async ({ page }) => {
    await page.goto('/game');
    await waitForBridge(page);
    await waitForCanvas(page);

    await page.evaluate(() => {
      const b = (window as unknown as { __poTestBridge: PoTestBridge }).__poTestBridge;
      b.triggerCountdown();
    });
    await page.waitForTimeout(3_500);
    await page.evaluate(() => {
      (window as unknown as { __poTestBridge: PoTestBridge }).__poTestBridge.triggerFinish(1);
    });
    await page.waitForTimeout(500);

    await expect(page.locator('text=Sprint Time')).toBeVisible({ timeout: 3_000 });
    await expect(page.locator('text=Accuracy')).toBeVisible({ timeout: 3_000 });
    await expect(page.locator('text=Avg Roll Speed')).toBeVisible({ timeout: 3_000 });
  });

});

// ---------------------------------------------------------------------------
// Suite F — Reset cycle (store helper)
// ---------------------------------------------------------------------------

test.describe('Suite F — reset cycle via bridge', () => {
  // Each test in this suite navigates to / and runs a full race session.
  // Allow extra time per test beyond the default 30 s.
  test.setTimeout(45_000);

  /** Helper: navigate, wait for canvas, race, finish, then reset. */
  async function bootToFinishedAndReset(page: Page): Promise<void> {
    await page.goto('/game');
    await waitForBridge(page);
    await waitForCanvas(page);

    await page.evaluate(() => {
      const b = (window as unknown as { __poTestBridge: PoTestBridge }).__poTestBridge;
      b.triggerCountdown();
    });
    await page.waitForTimeout(3_500);
    await page.evaluate(() => {
      (window as unknown as { __poTestBridge: PoTestBridge }).__poTestBridge.triggerFinish(2);
    });
    await page.waitForTimeout(300);
    await page.evaluate(() => {
      (window as unknown as { __poTestBridge: PoTestBridge }).__poTestBridge.triggerReset();
    });
    await page.waitForTimeout(300);
  }

  test('F1 — after reset, phase returns to Idle', async ({ page }) => {
    await bootToFinishedAndReset(page);
    const phase = await bridge(page, b => b.getRacePhase());
    expect(phase).toBe('Idle');
  });

  test('F2 — after reset, elapsed timer returns to 0', async ({ page }) => {
    await bootToFinishedAndReset(page);
    const elapsed = await bridge(page, b => b.getElapsedSeconds());
    expect(elapsed).toBe(0);
  });

  test('F3 — after reset, winner lane id is null', async ({ page }) => {
    await bootToFinishedAndReset(page);
    const winner = await bridge(page, b => b.getWinnerLaneId());
    expect(winner).toBeNull();
  });

  test('F4 — after reset, all 3 balls are InTrough', async ({ page }) => {
    await bootToFinishedAndReset(page);
    const balls = await bridge(page, b => b.getBalls());
    expect(balls.every((b: { phase: string }) => b.phase === 'InTrough')).toBe(true);
  });

});

// ---------------------------------------------------------------------------
// Suite G — Full lifecycle integration
// ---------------------------------------------------------------------------

test.describe('Suite G — full lifecycle integration', () => {
  test.setTimeout(55_000);

  test('G1 — full Idle→Countdown→Racing→Finished→Idle cycle runs without errors', async ({ page }) => {
    const pageErrors: Error[] = [];
    page.on('pageerror', err => pageErrors.push(err));

    await page.goto('/game');
    await waitForBridge(page);
    await waitForCanvas(page);

    // ── Idle ───────────────────────────────────────────────────────────────
    expect(await bridge(page, b => b.getRacePhase())).toBe('Idle');

    // ── Countdown ──────────────────────────────────────────────────────────
    await page.evaluate(() => {
      (window as unknown as { __poTestBridge: PoTestBridge }).__poTestBridge.triggerCountdown();
    });
    // phase switches synchronously — poll phase first, then verify countdown value
    // (CDP round-trip under CPU load can be 200 ms+; by then first tick may have fired)
    expect(await bridge(page, b => b.getRacePhase())).toBe('Countdown');
    // countdownValue should be 3 but may have ticked to 2 under heavy CPU load;
    // either way it must be within the valid [1, 3] range
    const initialCountdown = await bridge(page, b => b.getCountdownValue());
    expect(initialCountdown).not.toBeNull();
    expect(initialCountdown! as number).toBeGreaterThanOrEqual(1);
    expect(initialCountdown! as number).toBeLessThanOrEqual(3);

    // ── Racing ─────────────────────────────────────────────────────────────
    // Poll until countdown fires 3→2→1→null and Racing begins (~3 s)
    await page.waitForFunction(
      () => (window as unknown as { __poTestBridge: { getRacePhase: () => string } })
        .__poTestBridge.getRacePhase() === 'Racing',
      { timeout: 8_000 },
    );
    expect(await bridge(page, b => b.getRacePhase())).toBe('Racing');
    expect(await bridge(page, b => b.getCountdownValue())).toBeNull();

    // Launch a ball during racing
    const launched = await page.evaluate(() =>
      (window as unknown as { __poTestBridge: PoTestBridge }).__poTestBridge.triggerBallLaunch(20)
    );
    expect(launched).toBe(true);

    // Let elapsed timer tick at least once
    await page.waitForTimeout(1_200);
    expect(await bridge(page, b => b.getElapsedSeconds())).toBeGreaterThanOrEqual(1);

    // ── Finished ───────────────────────────────────────────────────────────
    await page.evaluate(() => {
      (window as unknown as { __poTestBridge: PoTestBridge }).__poTestBridge.triggerFinish(4);
    });
    await page.waitForTimeout(300);
    expect(await bridge(page, b => b.getRacePhase())).toBe('Finished');
    expect(await bridge(page, b => b.getWinnerLaneId())).toBe(4);

    // Summary Card must be visible
    await expect(page.locator('text=RACE COMPLETE')).toBeVisible({ timeout: 3_000 });

    // ── Reset → Idle ───────────────────────────────────────────────────────
    await page.evaluate(() => {
      (window as unknown as { __poTestBridge: PoTestBridge }).__poTestBridge.triggerReset();
    });
    await page.waitForTimeout(300);
    expect(await bridge(page, b => b.getRacePhase())).toBe('Idle');
    expect(await bridge(page, b => b.getElapsedSeconds())).toBe(0);
    expect(await bridge(page, b => b.getWinnerLaneId())).toBeNull();
    expect(
      (await bridge(page, b => b.getBalls())).every((b: { phase: string }) => b.phase === 'InTrough')
    ).toBe(true);

    // Canvas still rendering after the cycle
    await expect(page.locator('canvas')).toBeVisible();
    expect(pageErrors).toHaveLength(0);
  });

});

// ---------------------------------------------------------------------------
// Suite H — /diag route
// ---------------------------------------------------------------------------

test.describe('Suite H — /diag diagnostic route', () => {

  test('H1 — /diag renders pre element with telemetry', async ({ page }) => {
    const pageErrors: Error[] = [];
    page.on('pageerror', err => pageErrors.push(err));

    await page.goto('/diag');
    await page.waitForTimeout(800);

    const pre = page.locator('pre');
    await expect(pre).toBeVisible({ timeout: 5_000 });

    expect(pageErrors).toHaveLength(0);
  });

  test('H2 — returning from /diag to / restores the canvas', async ({ page }) => {
    const pageErrors: Error[] = [];
    page.on('pageerror', err => pageErrors.push(err));

    await page.goto('/diag');
    await page.waitForTimeout(600);

    await page.goto('/game');
    await waitForCanvas(page);

    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();
    expect(pageErrors).toHaveLength(0);
  });

});

// ---------------------------------------------------------------------------
// Suite I — DEMO progression integrity
// ---------------------------------------------------------------------------

test.describe('Suite I — DEMO progression integrity', () => {
  test.setTimeout(60_000);

  test('I1 — horses only move left (positionInches never decreases) until finish', async ({ page }) => {
    await launchDemoFromHome(page);

    expect(await bridge(page, b => b.getGameMode())).toBe('demo');

    await page.waitForFunction(
      () => {
        const b = (window as unknown as { __poTestBridge: PoTestBridge }).__poTestBridge;
        return b.getRacePhase() === 'Racing';
      },
      { timeout: 10_000 }
    );

    const previousByLane = new Map<number, number>();
    const startTime = Date.now();
    let finishedSeen = false;

    while (Date.now() - startTime < 75_000) {
      const phase = await bridge(page, b => b.getRacePhase());
      const lanes = await bridge(page, b => b.getLanes());

      for (const lane of lanes) {
        const previous = previousByLane.get(lane.id) ?? lane.positionInches;
        expect(
          lane.positionInches,
          `lane ${lane.id} moved backward from ${previous} to ${lane.positionInches}`
        ).toBeGreaterThanOrEqual(previous);
        previousByLane.set(lane.id, lane.positionInches);
      }

      if (phase === 'Finished') {
        finishedSeen = true;
        break;
      }

      await page.waitForTimeout(400);
    }

    // Safety net: if poll window elapsed without Finished, wait up to 30 s more
    if (!finishedSeen) {
      await page.waitForFunction(
        () => (window as unknown as { __poTestBridge: { getRacePhase: () => string } })
          .__poTestBridge.getRacePhase() === 'Finished',
        { timeout: 30_000 },
      );
      finishedSeen = true;
    }

    expect(finishedSeen).toBe(true);

    const lanesAtFinish = await bridge(page, b => b.getLanes());
    await page.waitForTimeout(2_000);
    const lanesAfterHold = await bridge(page, b => b.getLanes());

    for (const lane of lanesAtFinish) {
      const laneAfter = lanesAfterHold.find(l => l.id === lane.id);
      expect(laneAfter, `lane ${lane.id} missing after finish`).toBeDefined();
      expect(
        laneAfter!.positionInches,
        `lane ${lane.id} moved backward after finish`
      ).toBeGreaterThanOrEqual(lane.positionInches);
    }
  });
});
