import { test, expect, type Page } from '@playwright/test';

interface PoTestBridge {
  getGameMode: () => string;
  getRacePhase: () => string;
  getWinnerLaneId: () => number | null;
  getLanes: () => Array<{ id: number; score: number; positionInches: number }>;
  getBalls: () => Array<{ id: number; laneId: number; phase: string }>;
}

async function waitForBridge(page: Page): Promise<void> {
  await page.waitForFunction(
    () => typeof (window as unknown as { __poTestBridge?: unknown }).__poTestBridge !== 'undefined',
    { timeout: 12_000 }
  );
}

async function bridge<T>(page: Page, fn: (b: PoTestBridge) => T): Promise<T> {
  return page.evaluate(
    (fnStr) => {
      const b = (window as unknown as { __poTestBridge: PoTestBridge }).__poTestBridge;
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
  await page.waitForSelector('canvas', { timeout: 12_000 });
  await waitForBridge(page);
}

test.describe('DEMO mode smoke', () => {
  test.setTimeout(75_000);

  test('home DEMO button launches autonomous 8-lane race loop', async ({ page }) => {
    const pageErrors: Error[] = [];
    page.on('pageerror', err => pageErrors.push(err));

    await launchDemoFromHome(page);

    const mode = await bridge(page, b => b.getGameMode());
    expect(mode).toBe('demo');

    const balls = await bridge(page, b => b.getBalls());
    expect(balls).toHaveLength(24);
    const laneIds = new Set(balls.map(ball => ball.laneId));
    expect(laneIds.size).toBe(8);

    await page.waitForFunction(
      () => {
        const b = (window as unknown as { __poTestBridge: PoTestBridge }).__poTestBridge;
        return b.getRacePhase() === 'Racing';
      },
      { timeout: 10_000 }
    );

    await page.waitForFunction(
      () => {
        const b = (window as unknown as { __poTestBridge: PoTestBridge }).__poTestBridge;
        return b.getRacePhase() === 'Finished';
      },
      { timeout: 45_000 }
    );

    const winnerLane = await bridge(page, b => b.getWinnerLaneId());
    expect(winnerLane).not.toBeNull();

    const lanesAtFinish = await bridge(page, b => b.getLanes());
    const advancedLanes = lanesAtFinish.filter(lane => lane.score > 0 || lane.positionInches > 0);
    expect(advancedLanes.length).toBeGreaterThan(0);

    await page.waitForTimeout(3_000);
    const phaseAfterHold = await bridge(page, b => b.getRacePhase());
    expect(phaseAfterHold).toBe('Finished');

    expect(pageErrors).toHaveLength(0);
  });

  test('horses only move left (positions never decrease) until finish', async ({ page }) => {
    await launchDemoFromHome(page);

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

    while (Date.now() - startTime < 45_000) {
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

    expect(finishedSeen).toBe(true);

    const atFinish = await bridge(page, b => b.getLanes());
    await page.waitForTimeout(2_000);
    const afterHold = await bridge(page, b => b.getLanes());

    for (const lane of atFinish) {
      const laneAfterHold = afterHold.find(l => l.id === lane.id);
      expect(laneAfterHold, `lane ${lane.id} missing after finish`).toBeDefined();
      expect(
        laneAfterHold!.positionInches,
        `lane ${lane.id} moved backward after finish`
      ).toBeGreaterThanOrEqual(lane.positionInches);
    }
  });
});
