import { defineConfig, devices } from '@playwright/test';

/**
 * E2E テストは、サブパス配下（GitHub Pages と同じ形）に置いたビルド成果物に対して実行する（要件14.3）。
 * 事前に `SITE_BASE=/stats-pre1/ npm run build` でビルドしておくこと（`npm run test:e2e` が両方を行う）。
 */
export const E2E_BASE = '/stats-pre1/';
const PORT = 4322;

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: `http://localhost:${PORT}${E2E_BASE}`, trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] }, testIgnore: /mobile\.spec\.ts/ },
    { name: 'mobile', use: { ...devices['Pixel 7'] }, testMatch: /mobile\.spec\.ts/ },
  ],
  webServer: {
    command: 'node scripts/serve-dist.mjs',
    env: { SITE_BASE: E2E_BASE, PORT: String(PORT) },
    url: `http://localhost:${PORT}${E2E_BASE}`,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
