import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";
import { ariaSnapshot } from "@scout/testing/vitest-commands";
// Components are served msw's own worker script, so it always matches the
// installed client; msw 3 no longer copies it into a public folder on install.
const mswWorkerDirectory = path.dirname(
  createRequire(
    new URL("./packages/testing/package.json", import.meta.url),
  ).resolve("msw/mockServiceWorker.js"),
);
// Shards upload raw coverage; the gate runs once on the merged report.
const gate = process.env.COVERAGE_GATE !== "off";
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "unit",
          include: ["packages/**/*.test.{ts,tsx}", "apps/**/*.test.{ts,tsx}"],
          exclude: [
            "**/node_modules/**",
            "**/*.browser.test.tsx",
            "**/*.perf.test.ts",
            "**/*.integration.test.ts",
          ],
        },
      },
      {
        // Real Postgres through testcontainers; needs Docker, runs in CI.
        test: {
          name: "integration",
          include: ["packages/**/*.integration.test.ts"],
          fileParallelism: false,
          testTimeout: 60_000,
          hookTimeout: 300_000,
        },
      },
      {
        // Timing budgets run alone so unit shards stay deterministic.
        test: {
          name: "perf",
          include: ["packages/**/*.perf.test.ts"],
          fileParallelism: false,
        },
      },
      {
        // Components render in real Chromium: apps/web is the Vite root so
        // its PostCSS (Tailwind) config and globals.css apply as in the app.
        root: "apps/web",
        publicDir: mswWorkerDirectory,
        test: {
          name: "browser",
          include: ["app/**/*.browser.test.tsx", "test/**/*.browser.test.tsx"],
          setupFiles: [
            fileURLToPath(
              new URL("./apps/web/test/browser-setup.ts", import.meta.url),
            ),
          ],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({
              contextOptions: {
                timezoneId: "Europe/London",
                locale: "en-GB",
                reducedMotion: "reduce",
              },
            }),
            instances: [{ browser: "chromium" }],
            commands: { ariaSnapshot },
          },
        },
      },
    ],
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "html", "lcov", "json-summary"],
      reportsDirectory: "coverage",
      include: [
        "packages/*/src/**/*.ts",
        "apps/*/src/**/*.ts",
        "apps/web/app/**/*.ts",
      ],
      exclude: [
        "**/*.test.ts",
        "**/*.benchmark.ts",
        "**/*.smoke.ts",
        "**/*.perf.test.ts",
        "**/*.integration.test.ts",
        "**/*.spec.ts",
        "**/*-fixtures.ts",
        "**/fixtures/**",
        "**/main.ts",
        // Entry points and fixtures that run outside the unit project; the
        // logic they wire up is tested where it lives.
        "**/*.cli.ts",
        "packages/testing/src/playwright.ts",
        "packages/testing/src/vitest-commands.ts",
        "packages/testing/src/drift.ts",
        "apps/api/src/server.ts",
        "packages/database/**",
        "apps/worker/**",
        "apps/web/app/**/*.server.ts",
      ],
      ...(gate && {
        thresholds: {
          statements: 80,
          branches: 80,
          functions: 80,
          lines: 80,
          "packages/analysis/src/**/*.ts": {
            statements: 100,
            branches: 100,
            functions: 100,
            lines: 100,
          },
          "packages/application/src/**/*.ts": {
            statements: 95,
            branches: 95,
            functions: 95,
            lines: 95,
          },
        },
      }),
    },
  },
});
