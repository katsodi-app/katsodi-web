import { defineConfig, devices } from "@playwright/test";
import consentState from "./tests/fixtures/consent-state.json";
const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  workers: 2,
  timeout: 60000,
  // Dev route compilation can exceed the default 5-second assertion budget.
  expect: { timeout: 15000 },
  use: {
    baseURL,
    trace: "retain-on-failure",
    // Visitors who already allowed embedded players; consent.spec.ts starts
    // without a choice to test the banner and the gates.
    storageState: {
      ...consentState,
      origins: consentState.origins.map((entry) => ({
        ...entry,
        origin: new URL(baseURL).origin,
      })),
    },
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    {
      name: "mobile",
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
  ],
  webServer: {
    command: process.env.PLAYWRIGHT_SERVER_COMMAND || "npm run dev",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
