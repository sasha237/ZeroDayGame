import { defineConfig } from '@playwright/test';

const apiUrl = process.env.AW_API_URL ?? 'http://127.0.0.1:8080';
const apiPort = new URL(apiUrl).port || '80';
const node = `"${process.execPath}"`;

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    channel: 'chrome',
    headless: true,
    viewport: { width: 1440, height: 960 },
    screenshot: 'only-on-failure',
  },
  webServer: [
    {
      command: `${node} packages/server/dist/index.js`,
      url: `${apiUrl}/healthz`,
      env: { PORT: apiPort, REPO: 'memory' },
      reuseExistingServer: true,
      timeout: 60_000,
    },
    {
      command: `${node} node_modules/vite/bin/vite.js preview packages/client --host 127.0.0.1 --port 4173 --strictPort`,
      url: 'http://127.0.0.1:4173',
      reuseExistingServer: true,
      timeout: 60_000,
    },
  ],
});
