/**
 * _adhoc_demo_verify.ts — Ad-hoc Playwright demo-mode verification
 *
 * Verifies:
 *  1. Demo launches and reaches Racing phase
 *  2. Balls enter holes and positively advance horse positions
 *  3. Horse positions never decrease (monotonic)
 *  4. Point values 1/2/3/5 correctly drive horse movement (INCHES_PER_POINT=0.6)
 *  5. Race completes with a winner
 *  Screenshots captured at: Idle, Countdown, Racing-start, ~mid-race, Finished
 */

import { test, expect, type Page } from '@playwright/test';

const SCREENSHOT_DIR = 'test-results/screenshots';
const BASE = 'http://localhost:5173';

interface PoTestBridge {
  getGameMode: () => string;
  getRacePhase: () => string;
  getWinnerLaneId: () => number | null;
  getLanes: () => Array<{ id: number; score: number; positionInches: number; color: string }>;
  getBalls: () => Array<{ id: number; laneId: number; phase: string }>;
  getCountdownValue: () => number | null;
}

async function waitForBridge(page: Page) {
  await page.waitForFunction(
    () => typeof (window as any).__poTestBridge !== 'undefined',
    { timeout: 12_000 }
  );
}

async function bridge<T>(page: Page, fn: (b: PoTestBridge) => T): Promise<T> {
  return page.evaluate((fnStr: string) => {
    const b = (window as any).__poTestBridge as PoTestBridge;
    return new Function('b', `return (${fnStr})(b)`)(b) as T;
  }, fn.toString());
}

test.describe('PoRun — Demo Mode Behaviour Verification', () => {
  test.setTimeout(120_000);

  test('full demo race: holes score 1/2/3/5 → horses advance monotonically → winner', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

    // ── 1. Home screen ──────────────────────────────────────────────────────
    await page.goto(BASE);
    await expect(page.getByRole('button', { name: 'Demo' })).toBeVisible({ timeout: 8_000 });
    await page.screenshot({ path: `${SCREENSHOT_DIR}/adhoc_01_home.png`, fullPage: true });

    // ── 2. Launch demo ──────────────────────────────────────────────────────
    await page.getByRole('button', { name: 'Demo' }).click();
    await page.waitForURL('**/game', { timeout: 8_000 });
    await page.waitForSelector('canvas', { timeout: 15_000 });
    await waitForBridge(page);

    const mode = await bridge(page, b => b.getGameMode());
    expect(mode, 'gameMode should be demo').toBe('demo');

    const balls = await bridge(page, b => b.getBalls());
    expect(balls, 'should have 24 balls (3 × 8 lanes)').toHaveLength(24);
    const laneIds = new Set(balls.map(b => b.laneId));
    expect(laneIds.size, 'all 8 lanes should have balls').toBe(8);

    // ── 3. Countdown screenshot ─────────────────────────────────────────────
    await page.waitForFunction(
      () => (window as any).__poTestBridge.getRacePhase() === 'Countdown',
      { timeout: 10_000 }
    );
    await page.screenshot({ path: `${SCREENSHOT_DIR}/adhoc_02_countdown.png`, fullPage: true });
    const countdown = await bridge(page, b => b.getCountdownValue());
    console.log(`Countdown value: ${countdown}`);

    // ── 4. Race starts ──────────────────────────────────────────────────────
    await page.waitForFunction(
      () => (window as any).__poTestBridge.getRacePhase() === 'Racing',
      { timeout: 12_000 }
    );
    await page.screenshot({ path: `${SCREENSHOT_DIR}/adhoc_03_racing_start.png`, fullPage: true });
    console.log('Phase: Racing — balls flying!');

    // ── 5. Monitor horse movement monotonicity ──────────────────────────────
    const positionHistory = new Map<number, number[]>();
    for (let i = 1; i <= 8; i++) positionHistory.set(i, [0]);

    let scoreEvents = 0;
    const pollStart = Date.now();
    let midRaceShot = false;

    while (Date.now() - pollStart < 70_000) {
      const phase = await bridge(page, b => b.getRacePhase());
      const lanes = await bridge(page, b => b.getLanes());

      for (const lane of lanes) {
        const history = positionHistory.get(lane.id)!;
        const prev = history[history.length - 1];

        // Monotonic check
        expect(
          lane.positionInches,
          `Lane ${lane.id} went BACKWARD: ${prev}→${lane.positionInches}`
        ).toBeGreaterThanOrEqual(prev);

        if (lane.positionInches > prev) {
          scoreEvents++;
          history.push(lane.positionInches);
        }
      }

      // Mid-race screenshot when any lane is > 20 inches
      if (!midRaceShot && lanes.some(l => l.positionInches > 20)) {
        await page.screenshot({ path: `${SCREENSHOT_DIR}/adhoc_04_mid_race.png`, fullPage: true });
        midRaceShot = true;
        const leaderInches = Math.max(...lanes.map(l => l.positionInches));
        const leaderLane = lanes.find(l => l.positionInches === leaderInches);
        console.log(`Mid-race leader: Lane ${leaderLane?.id} (${leaderInches.toFixed(1)}")`);
        // Log all positions
        lanes.forEach(l => console.log(`  Lane ${l.id}: ${l.positionInches.toFixed(2)}" (score=${l.score})`));
      }

      if (phase === 'Finished') break;
      await page.waitForTimeout(300);
    }

    console.log(`Total score events observed: ${scoreEvents}`);
    expect(scoreEvents, 'at least some score events must fire during race').toBeGreaterThan(0);

    // ── 6. Finished screenshot ──────────────────────────────────────────────
    // If the race didn't finish within the poll window, wait a bit longer for the
    // winner to be declared (headless throttling can delay the final scoring tick).
    await page.waitForFunction(
      () => (window as any).__poTestBridge.getRacePhase() === 'Finished',
      { timeout: 30_000 },
    );
    const finalPhase = await bridge(page, b => b.getRacePhase());
    expect(finalPhase, 'race must reach Finished').toBe('Finished');

    await page.screenshot({ path: `${SCREENSHOT_DIR}/adhoc_05_finished.png`, fullPage: true });

    const winner = await bridge(page, b => b.getWinnerLaneId());
    expect(winner, 'a winner lane must be declared').not.toBeNull();
    console.log(`Winner: Lane ${winner}`);

    const finalLanes = await bridge(page, b => b.getLanes());
    const winnerLane = finalLanes.find(l => l.id === winner);
    console.log(`Winner position: ${winnerLane?.positionInches}" (score=${winnerLane?.score})`);

    // ── 7. Verify score→inch ratio integrity ───────────────────────────────
    // Each lane: positionInches should be approx score × 0.6 (clamped to 60)
    for (const lane of finalLanes) {
      const expectedInches = Math.min(lane.score * 0.6, 60);
      const delta = Math.abs(lane.positionInches - expectedInches);
      expect(
        delta,
        `Lane ${lane.id}: positionInches=${lane.positionInches.toFixed(2)} but score=${lane.score} implies ~${expectedInches.toFixed(2)}" (drift=${delta.toFixed(2)}")`
      ).toBeLessThan(0.01); // allow floating-point epsilon
    }

    // ── 8. Console errors check ─────────────────────────────────────────────
    if (errors.length > 0) {
      console.warn('Console errors during test:', errors);
    }
    // Soft assertion — log but do not fail on non-critical console errors
    const criticalErrors = errors.filter(e =>
      !e.includes('ResizeObserver') && !e.includes('favicon')
    );
    expect(criticalErrors, `Critical JS errors: ${criticalErrors.join('\n')}`).toHaveLength(0);
  });

  test('hole point values drive correct inch increments (score×0.6 per point)', async ({ page }) => {
    /**
     * Validates the fundamental mechanic: each point scored moves the horse
     * exactly INCHES_PER_POINT (0.6) inches forward.
     * - hole 1 pt  → +0.6"
     * - hole 2 pts → +1.2"
     * - hole 3 pts → +1.8"
     * - hole 5 pts → +3.0"  (apex)
     */
    await page.goto(BASE);
    await page.getByRole('button', { name: 'Demo' }).click();
    await page.waitForURL('**/game');
    await page.waitForSelector('canvas', { timeout: 15_000 });
    await waitForBridge(page);

    // Fast-forward to Racing
    await page.waitForFunction(
      () => (window as any).__poTestBridge.getRacePhase() === 'Racing',
      { timeout: 12_000 }
    );

    // Sample positions every 500ms; record distinct increments observed
    const observedIncrements = new Set<string>();
    const laneSnapshots = new Map<number, number>();

    // Initialize
    const initLanes = await bridge(page, b => b.getLanes());
    for (const l of initLanes) laneSnapshots.set(l.id, l.positionInches);

    const sampleEnd = Date.now() + 20_000;
    while (Date.now() < sampleEnd) {
      const lanes = await bridge(page, b => b.getLanes());
      for (const lane of lanes) {
        const prev = laneSnapshots.get(lane.id) ?? 0;
        const delta = lane.positionInches - prev;
        if (delta > 0.001) {
          const rounded = Math.round(delta * 100) / 100;
          observedIncrements.add(rounded.toFixed(2));
          laneSnapshots.set(lane.id, lane.positionInches);
        }
      }

      const phase = await bridge(page, b => b.getRacePhase());
      if (phase === 'Finished') break;
      await page.waitForTimeout(500);
    }

    console.log('Observed inch increments during demo:', [...observedIncrements].sort());

    // All increments should be multiples of 0.6 (within float tolerance)
    for (const inc of observedIncrements) {
      const val = parseFloat(inc);
      const remainder = val % 0.6;
      const isMultiple = remainder < 0.02 || Math.abs(remainder - 0.6) < 0.02;
      expect(
        isMultiple,
        `Increment ${inc}" is NOT a multiple of 0.6" (INCHES_PER_POINT). Got remainder=${remainder.toFixed(4)}`
      ).toBe(true);
    }

    expect(observedIncrements.size, 'should observe at least one distinct increment').toBeGreaterThan(0);
  });
});
