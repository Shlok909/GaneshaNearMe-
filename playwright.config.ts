import { defineConfig, devices } from "@playwright/test";

// Playwright configures worker colors itself; don't pass conflicting host flags.
delete process.env.NO_COLOR;
const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3002";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: "list",
  use: {
    baseURL,
    channel: process.env.PLAYWRIGHT_CHANNEL || "chrome",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "logic", testMatch: /.*\.logic\.spec\.ts/ },
    {
      name: "mobile",
      testIgnore: /.*\.logic\.spec\.ts/,
      use: {
        ...devices["iPhone 13"],
        defaultBrowserType: "chromium",
        viewport: { width: 390, height: 844 },
      },
    },
    {
      name: "desktop",
      testIgnore: /.*\.logic\.spec\.ts/,
      use: { viewport: { width: 1440, height: 960 } },
    },
  ],
  webServer: [
    {
      command: "node tests/support/auth-server.mjs",
      url: "http://127.0.0.1:54329/__test/state",
      reuseExistingServer: false,
    },
    {
      command: "node tests/support/start-app.mjs",
      url: baseURL,
      reuseExistingServer: false,
      timeout: 180_000,
      env: {
        NEXT_BUILD_DIR: ".next-e2e",
        NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54329",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test_only",
        NEXT_PUBLIC_SITE_URL: baseURL,
      },
    },
  ],
});
