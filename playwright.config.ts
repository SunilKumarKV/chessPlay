import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.BASE_URL?.replace(/\/$/, '') || 'https://getchessplay.vercel.app';

export default defineConfig({
  testDir: '.',
  testMatch: 'tests/production-smoke.spec.ts',
  timeout: 180_000,
  expect: { timeout: 45_000 },
  retries: 0,
  workers: 1,
  fullyParallel: false,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'test-results/playwright-report' }]],
  outputDir: 'test-results/playwright',
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    {
      name: 'chromium-desktop',
      use: {
        ...devices['Desktop Chrome'],
        channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome',
      },
    },
  ],
});
