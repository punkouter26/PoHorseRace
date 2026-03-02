import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

// Vitest configuration merged with the base Vite config.
// Kept in a separate file to avoid the Plugin<any> type conflict that occurs
// when importing defineConfig from 'vitest/config' in a file that also uses
// @vitejs/plugin-react (which resolves Plugin types from the top-level vite).
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      // jsdom environment for React + R3F component tests
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./tests/setup.ts'],
      // Exclude e2e Playwright tests — those run via `npx playwright test`, not Vitest
      include: ['tests/unit/**/*.test.{ts,tsx}', 'tests/integration/**/*.test.{ts,tsx}'],
      exclude: ['tests/e2e/**'],
    },
  })
);
