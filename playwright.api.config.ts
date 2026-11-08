import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/connected',
  outputDir: './test-results/connected',
  workers: 1,
  fullyParallel: false,
  timeout: 45000,
  reporter: [['list']],
  use: {
    ...devices['Desktop Chrome'],
    ...(process.env.CI ? {} : { channel: 'chrome' }),
    baseURL: 'http://127.0.0.1:4174/Dashboards-Tour4Friends/',
    trace: 'off',
    screenshot: 'only-on-failure',
    viewport: { width: 1440, height: 1000 },
  },
});
