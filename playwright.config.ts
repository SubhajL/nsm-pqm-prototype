import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

const projectDemoStateFile =
  process.env.PROJECT_DEMO_STATE_FILE ??
  path.join(process.cwd(), '.data', 'playwright-project-demo-state.json');

process.env.PROJECT_DEMO_STATE_FILE = projectDemoStateFile;

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 90_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL: 'http://127.0.0.1:3101',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command:
      `rm -f "${projectDemoStateFile}" && ` +
      `PROJECT_DEMO_STATE_FILE="${projectDemoStateFile}" ` +
      // งวดงาน payment flow (PR work-periods) is gated by these two env
      // vars; the e2e needs both ON to exercise the API + nav.
      `FEATURE_RID_PAYMENT_FLOW=true NEXT_PUBLIC_FEATURE_RID_PAYMENT_FLOW=true ` +
      'npm run dev -- --hostname 127.0.0.1 --port 3101',
    url: 'http://127.0.0.1:3101/login',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
