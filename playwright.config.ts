import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  fullyParallel: false,
  use: {
    baseURL: process.env.TEST_URL || 'http://localhost:3000',
    viewport: { width: 1440, height: 1100 },
    headless: true,
  },
  webServer: process.env.TEST_URL
    ? undefined
    : {
        command: 'npm run dev',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
      },
  reporter: 'list',
});
