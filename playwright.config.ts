import { defineConfig, devices } from '@playwright/test';
import 'dotenv/config';

/**
 * Pics.io "Saved searches" test challenge.
 * UI tests run against pics.io with a real trial account; auth is done once in global setup (auth/user.json).
 * API calls use the account's API key (PICSIO_API_KEY) for setup and cleanup.
 */
export default defineConfig({
  testDir: './tests',
  globalSetup: './tests/global.setup.ts',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false, // one trial account, one saved-searches tree: tests create unique names but run serially
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'https://pics.io',
    storageState: 'auth/user.json',
    viewport: { width: 1440, height: 900 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } }],
});
