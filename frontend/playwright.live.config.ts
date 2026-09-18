import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/live',
  outputDir: './test-results/live',
  use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:5173', viewport: { width: 1440, height: 1000 }, trace: 'retain-on-failure' },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1', url: 'http://localhost:5173', reuseExistingServer: false,
    env: { VITE_API_BASE_URL: process.env.LIVE_API_BASE_URL || 'http://localhost:8000' },
  },
});
