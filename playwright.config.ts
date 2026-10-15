import { defineConfig, devices } from "@playwright/test";

const ci = !!process.env.CI;
// Visual baselines are Linux renders; compare them only in CI or the container.
const visual = ci || process.env.VISUAL === "1";

export default defineConfig({
  testDir: ".",
  testMatch: ["e2e/*.spec.ts"],
  fullyParallel: true,
  // One worker per core: private repositories get 2-vCPU runners, public ones 4.
  workers: "100%",
  retries: ci ? 1 : 0,
  forbidOnly: ci,
  reporter: ci
    ? [["blob"], ["github"]]
    : [["list"], ["html", { open: "never" }]],
  expect: {
    toMatchAriaSnapshot: { pathTemplate: "{testDir}/e2e/__aria__/{arg}{ext}" },
    toHaveScreenshot: {
      pathTemplate: "{testDir}/e2e/__screenshots__/{projectName}/{arg}{ext}",
    },
  },
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: ci ? "on-first-retry" : "retain-on-failure",
    video: ci ? "retain-on-failure" : "off",
  },
  webServer: {
    command: "pnpm --filter @scout/web dev",
    url: "http://127.0.0.1:3000/health",
    // Locally a dev server on :3000 is reused; CI always starts its own.
    reuseExistingServer: !ci,
  },
  projects: [
    {
      name: "chromium-desktop",
      use: { ...devices["Desktop Chrome"] },
      grepInvert: visual ? /@mobile-only/ : /@mobile-only|@visual/,
    },
    {
      name: "chromium-mobile",
      testMatch: ["e2e/*.spec.ts"],
      use: { ...devices["Pixel 7"] },
      grep: /@mobile/,
      grepInvert: /@visual/,
    },
    {
      name: "webkit-a11y",
      testMatch: ["e2e/*.spec.ts"],
      use: { ...devices["Desktop Safari"] },
      grep: /@a11y|@keyboard/,
      grepInvert: /@visual/,
    },
  ],
});
