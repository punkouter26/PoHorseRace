import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  // Exclude adhoc tests from the default CI suite — run with:
  //   npx playwright test tests/e2e/adhoc_demo_verify.test.ts
  testIgnore: ['**/adhoc_*.test.ts'],
  timeout: 45_000,
  retries: 0,
  reporter: 'list',

  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
    viewport: { width: 390, height: 844 }, // iPhone-14 portrait — matches game layout
    // Capture console messages and screenshots on failure
    screenshot: 'only-on-failure',
    video: 'off',
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          // Required for Rapier WASM + requestAnimationFrame in headless mode.
          // Without these flags, the R3F render loop doesn't tick and physics
          // never steps, causing all ball-scoring E2E tests to fail.
          args: [
            '--disable-background-timer-throttling',
            '--disable-renderer-backgrounding',
            '--disable-backgrounding-occluded-windows',
            // Prevent Chrome from throttling JS timers via feature flags
            '--disable-features=TimerThrottlingForBackgroundTabs,OptimizeLoadingIPCForSmallResources',
            // Keep animation frame callbacks firing even in headless
            '--run-all-compositor-stages-before-draw',
            '--disable-ipc-flooding-protection',
          ],
        },
      },
    },
  ],

  // Ensure dev server is running — if not, start it automatically
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 15_000,
  },
});
