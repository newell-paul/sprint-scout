import { defineConfig, devices } from "@playwright/test";

// Deploy gate: the @smoke journeys against the static export, served the way a
// GitHub Pages project site serves it. Build first with
// NEXT_PUBLIC_BASE_PATH=/sprint-scout pnpm --filter @scout/web build:static.
export default defineConfig({
  testDir: ".",
  testMatch: ["e2e/*.spec.ts"],
  testIgnore: ["e2e/demo.spec.ts"],
  grep: /@smoke/,
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? [["github"], ["list"]] : [["list"]],
  expect: {
    toMatchAriaSnapshot: { pathTemplate: "{testDir}/e2e/__aria__/{arg}{ext}" },
  },
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "node scripts/serve-static.mjs apps/web/out",
    url: "http://127.0.0.1:4173/sprint-scout/",
    env: { NEXT_PUBLIC_BASE_PATH: "/sprint-scout" },
    reuseExistingServer: false,
  },
  projects: [
    { name: "static-chromium", use: { ...devices["Desktop Chrome"] } },
  ],
});
